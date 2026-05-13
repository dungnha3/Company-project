package DoAn.BE.timetracking.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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

    /**
     * My timelog summary - total hours this week, this month, breakdown by project/day
     */
    public Map<String, Object> getMyTimelogSummary(User currentUser) {
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null || currentUser == null) {
            return java.util.Collections.emptyMap();
        }

        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.minusDays(today.getDayOfWeek().getValue() - 1);
        LocalDate weekEnd = weekStart.plusDays(6);
        LocalDate monthStart = today.withDayOfMonth(1);
        LocalDate monthEnd = today.withDayOfMonth(today.lengthOfMonth());

        BigDecimal weekHours = timeLogRepository.sumHoursByUserAndDateRange(
                currentUser.getUserId(), weekStart, weekEnd);
        BigDecimal monthHours = timeLogRepository.sumHoursByUserAndDateRange(
                currentUser.getUserId(), monthStart, monthEnd);
        BigDecimal totalHours = timeLogRepository.sumHoursByUser(currentUser.getUserId(), companyId);
        if (weekHours == null) weekHours = BigDecimal.ZERO;
        if (monthHours == null) monthHours = BigDecimal.ZERO;
        if (totalHours == null) totalHours = BigDecimal.ZERO;

        List<TimeLog> allLogs = timeLogRepository.findByUser_UserIdAndWorkDateBetween(
                currentUser.getUserId(), monthStart, monthEnd);

        // Hours by project
        Map<Long, Map<String, Object>> byProjectMap = new LinkedHashMap<>();
        for (TimeLog log : allLogs) {
            Long pid = log.getIssue().getProject().getProjectId();
            String pname = log.getIssue().getProject().getName();
            byProjectMap.computeIfAbsent(pid, k -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("projectId", pid);
                m.put("projectName", pname);
                m.put("totalHours", BigDecimal.ZERO);
                m.put("issueCount", 0);
                return m;
            });
            BigDecimal curr = (BigDecimal) byProjectMap.get(pid).get("totalHours");
            BigDecimal updated = (curr != null ? curr : BigDecimal.ZERO).add(log.getLoggedHours());
            byProjectMap.get(pid).put("totalHours", updated);
            Integer count = (Integer) byProjectMap.get(pid).get("issueCount");
            byProjectMap.get(pid).put("issueCount", count != null ? count + 1 : 1);
        }
        List<Map<String, Object>> byProject = new ArrayList<>(byProjectMap.values());

        // Hours by day
        Map<LocalDate, BigDecimal> byDayMap = new LinkedHashMap<>();
        for (TimeLog log : allLogs) {
            byDayMap.merge(log.getWorkDate(), log.getLoggedHours(), BigDecimal::add);
        }
        List<Map<String, Object>> byDay = byDayMap.entrySet().stream()
                .sorted(java.util.Map.Entry.<LocalDate, BigDecimal>comparingByKey().reversed())
                .limit(30)
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("date", e.getKey().toString());
                    m.put("hours", e.getValue());
                    return m;
                })
                .collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalHoursThisWeek", weekHours);
        result.put("totalHoursThisMonth", monthHours);
        result.put("totalHoursAllTime", totalHours);
        result.put("hoursByProject", byProject);
        result.put("hoursByDay", byDay);
        return result;
    }

    /**
     * Project timelog aggregation - total hours, by member, by sprint
     */
    public Map<String, Object> getProjectTimelogSummary(Long projectId) {
        List<Issue> issues = issueRepository.findByProject_ProjectId(projectId);
        BigDecimal totalHours = timeLogRepository.sumHoursByProject(projectId);
        if (totalHours == null) totalHours = BigDecimal.ZERO;

        List<TimeLog> allProjectLogs = new ArrayList<>();
        for (Issue issue : issues) {
            allProjectLogs.addAll(timeLogRepository.findByIssue_IssueIdOrderByWorkDateDesc(issue.getIssueId()));
        }
        Map<Long, Map<String, Object>> byMemberMap = new LinkedHashMap<>();
        for (TimeLog log : allProjectLogs) {
            Long uid = log.getUser().getUserId();
            byMemberMap.computeIfAbsent(uid, k -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("userId", uid);
                m.put("userName", log.getUser().getUsername());
                m.put("totalHours", BigDecimal.ZERO);
                m.put("issueCount", 0);
                return m;
            });
            BigDecimal curr = (BigDecimal) byMemberMap.get(uid).get("totalHours");
            BigDecimal updated = (curr != null ? curr : BigDecimal.ZERO).add(log.getLoggedHours());
            byMemberMap.get(uid).put("totalHours", updated);
            Integer count = (Integer) byMemberMap.get(uid).get("issueCount");
            byMemberMap.get(uid).put("issueCount", count != null ? count + 1 : 1);
        }
        List<Map<String, Object>> byMember = new ArrayList<>(byMemberMap.values());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("projectId", projectId);
        result.put("totalHours", totalHours);
        result.put("hoursByMember", byMember);
        result.put("totalIssues", issues.size());
        result.put("averagePerIssue",
                issues.isEmpty() ? BigDecimal.ZERO :
                        totalHours.divide(new BigDecimal(issues.size()), 1, RoundingMode.HALF_UP));
        return result;
    }
}
