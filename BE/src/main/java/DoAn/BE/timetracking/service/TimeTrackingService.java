package DoAn.BE.timetracking.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import DoAn.BE.common.context.TenantContext;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.common.util.SecurityUtil;
import DoAn.BE.company.repository.CompanyRepository;
import DoAn.BE.project.entity.Issue;
import DoAn.BE.project.repository.IssueRepository;
import DoAn.BE.project.repository.ProjectMemberRepository;
import DoAn.BE.timetracking.dto.CreateTimeLogRequest;
import DoAn.BE.timetracking.dto.TimeLogDTO;
import DoAn.BE.timetracking.entity.TimeLog;
import DoAn.BE.timetracking.repository.TimeLogRepository;
import DoAn.BE.user.entity.User;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class TimeTrackingService {

    private final TimeLogRepository timeLogRepository;
    private final IssueRepository issueRepository;
    private final CompanyRepository companyRepository;
    private final AccessControlService accessControlService;
    private final ProjectMemberRepository projectMemberRepository;

    // Log time for an issue
    // /
    @Transactional
    public TimeLogDTO logTime(CreateTimeLogRequest request) {
        User currentUser = SecurityUtil.getCurrentUser();
        Long companyId = TenantContext.getCompanyId();

        if (companyId == null) {
            throw new ForbiddenException("Yêu cầu context công ty để log time");
        }

        Issue issue = issueRepository.findById(request.getIssueId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy issue"));
        if (issue.getProject() != null) {
            checkProjectMembership(issue.getProject().getProjectId(), currentUser.getUserId());
        }
        if (request.getLoggedHours() == null || request.getLoggedHours().compareTo(java.math.BigDecimal.ZERO) <= 0
                || request.getLoggedHours().compareTo(java.math.BigDecimal.valueOf(24)) > 0) {
            throw new DoAn.BE.common.exception.BadRequestException("Logged hours phải từ 0.01 đến 24");
        }

        TimeLog timeLog = TimeLog.builder()
                .issue(issue)
                .user(currentUser)
                .company(companyRepository.getReferenceById(companyId))
                .loggedHours(request.getLoggedHours())
                .workDate(request.getWorkDate())
                .description(request.getDescription())
                .build();

        timeLog = timeLogRepository.save(timeLog);

        // Update issue's actualHours
        updateIssueActualHours(issue);

        log.info("User {} logged {} hours on issue {}",
                currentUser.getUserId(), request.getLoggedHours(), issue.getIssueKey());

        return toDTO(timeLog);
    }

    // Get time logs for an issue
    // /
    public List<TimeLogDTO> getIssueTimeLogs(Long issueId, User currentUser) {
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null) {
            throw new ForbiddenException("Yêu cầu context công ty");
        }

        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy issue"));

        // Verify project belongs to current company and user has access
        if (issue.getProject() != null) {
            checkProjectMembership(issue.getProject().getProjectId(), currentUser.getUserId());
        }

        return timeLogRepository.findByIssue_IssueIdOrderByWorkDateDesc(issueId)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    // Get my time logs (paginated)
    // /
    public Page<TimeLogDTO> getMyTimeLogs(User currentUser, Pageable pageable) {
        if (currentUser == null) {
            return Page.empty(pageable);
        }
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null) {
            return Page.empty(pageable);
        }

        return timeLogRepository.findByUser_UserIdAndCompany_CompanyIdOrderByWorkDateDesc(
                currentUser.getUserId(), companyId, pageable)
                .map(this::toDTO);
    }

    // Update a time log (only owner can update)
    // /
    @Transactional
    public TimeLogDTO updateTimeLog(Long logId, CreateTimeLogRequest request) {
        User currentUser = SecurityUtil.getCurrentUser();

        TimeLog timeLog = timeLogRepository.findById(logId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy time log"));

        // Only owner can update
        if (!timeLog.getUser().getUserId().equals(currentUser.getUserId())) {
            throw new ForbiddenException("Bạn chỉ có thể sửa time log của mình");
        }

        timeLog.setLoggedHours(request.getLoggedHours());
        timeLog.setWorkDate(request.getWorkDate());
        timeLog.setDescription(request.getDescription());

        timeLog = timeLogRepository.save(timeLog);

        // Recalculate issue hours
        updateIssueActualHours(timeLog.getIssue());

        return toDTO(timeLog);
    }

    // Delete a time log (only owner can delete)
    // /
    @Transactional
    public void deleteTimeLog(Long logId) {
        User currentUser = SecurityUtil.getCurrentUser();

        TimeLog timeLog = timeLogRepository.findById(logId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy time log"));

        // Only owner or admin can delete
        if (!timeLog.getUser().getUserId().equals(currentUser.getUserId())
                && !accessControlService.isOwnerOrAdmin()) {
            throw new ForbiddenException("Bạn không có quyền xóa time log này");
        }

        Issue issue = timeLog.getIssue();
        timeLogRepository.delete(timeLog);

        // Recalculate issue hours
        updateIssueActualHours(issue);
    }

    // Get total hours logged for an issue
    // /
    public BigDecimal getTotalHoursByIssue(Long issueId, User currentUser) {
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null) {
            throw new ForbiddenException("Yêu cầu context công ty");
        }
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy issue"));
        if (issue.getProject() != null) {
            checkProjectMembership(issue.getProject().getProjectId(), currentUser.getUserId());
        }
        return timeLogRepository.sumHoursByIssue(issueId);
    }

    // Get total hours by user in date range
    // /
    public BigDecimal getTotalHoursByUserInRange(Long userId, LocalDate start, LocalDate end) {
        User currentUser = SecurityUtil.getCurrentUser();
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null) {
            throw new ForbiddenException("Yêu cầu context công ty");
        }
        // Only allow viewing own data or admin
        if (!currentUser.getUserId().equals(userId) && !accessControlService.isOwnerOrAdmin()) {
            throw new ForbiddenException("Bạn không có quyền xem dữ liệu này");
        }
        return timeLogRepository.sumHoursByUserAndDateRange(userId, start, end);
    }
    private void checkProjectMembership(Long projectId, Long userId) {
        boolean isMember = projectMemberRepository.findByProject_ProjectIdAndUser_UserId(projectId, userId).isPresent();
        if (!isMember) {
            throw new ForbiddenException("Bạn không phải thành viên dự án này");
        }
    }

    // Update issue's actualHours based on sum of time logs
    // /
    private void updateIssueActualHours(Issue issue) {
        BigDecimal totalHours = timeLogRepository.sumHoursByIssue(issue.getIssueId());
        issue.setActualHours(totalHours);
        issueRepository.save(issue);
    }

    // Convert entity to DTO
    // /
    private TimeLogDTO toDTO(TimeLog timeLog) {
        return TimeLogDTO.builder()
                .logId(timeLog.getLogId())
                .issueId(timeLog.getIssue().getIssueId())
                .issueKey(timeLog.getIssue().getIssueKey())
                .issueTitle(timeLog.getIssue().getTitle())
                .projectId(timeLog.getIssue().getProject().getProjectId())
                .projectName(timeLog.getIssue().getProject().getName())
                .userId(timeLog.getUser().getUserId())
                .userName(timeLog.getUser().getUsername())
                .userAvatar(timeLog.getUser().getAvatarUrl())
                .loggedHours(timeLog.getLoggedHours())
                .workDate(timeLog.getWorkDate())
                .description(timeLog.getDescription())
                .createdAt(timeLog.getCreatedAt())
                .build();
    }
}
