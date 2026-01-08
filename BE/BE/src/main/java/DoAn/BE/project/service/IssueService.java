package DoAn.BE.project.service;

import DoAn.BE.common.exception.*;
import DoAn.BE.project.dto.CreateIssueRequest;
import DoAn.BE.project.dto.IssueDTO;
import DoAn.BE.project.dto.UpdateIssueRequest;
import DoAn.BE.project.entity.Issue;
import DoAn.BE.project.entity.IssueStatus;
import DoAn.BE.project.entity.IssueActivity;
import DoAn.BE.project.entity.IssueActivity.ActivityType;
import DoAn.BE.project.entity.Project;
import DoAn.BE.project.entity.ProjectMember;
import DoAn.BE.project.entity.Sprint;
import DoAn.BE.project.repository.IssueRepository;
import DoAn.BE.project.repository.IssueStatusRepository;
import DoAn.BE.project.repository.IssueActivityRepository;
import DoAn.BE.project.repository.ProjectMemberRepository;
import DoAn.BE.project.repository.ProjectRepository;
import DoAn.BE.project.repository.SprintRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

// [Service quản lý Issue/Công việc trong dự án] (Role: Project Member)
@Service
@RequiredArgsConstructor
@Transactional
@lombok.extern.slf4j.Slf4j
public class IssueService {

    private final IssueRepository issueRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final IssueStatusRepository issueStatusRepository;
    private final UserRepository userRepository;
    private final SprintRepository sprintRepository;
    private final IssueActivityRepository issueActivityRepository;
    private final DoAn.BE.notification.service.ProjectNotificationService projectNotificationService;
    private final DoAn.BE.notification.service.FCMService fcmService;

    @Transactional
    public IssueDTO createIssue(CreateIssueRequest request, Long userId) {
        User reporter = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy người dùng"));
        Project project = projectRepository.findById(request.getProjectId())
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy dự án"));
        validateProjectAccess(request.getProjectId(), userId);

        // Nếu không có statusId, mặc định là To Do (id: 1)
        Integer statusId = request.getStatusId() != null ? request.getStatusId() : 1;
        IssueStatus status = issueStatusRepository.findById(statusId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy trạng thái"));
        User assignee = null;
        if (request.getAssigneeId() != null) {
            assignee = userRepository.findById(request.getAssigneeId())
                    .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy người được giao việc"));
            validateProjectAccess(request.getProjectId(), request.getAssigneeId());
        }
        String issueKey = generateIssueKey(project);

        // Create issue
        Issue issue = new Issue();
        issue.setProject(project);
        issue.setIssueKey(issueKey);
        issue.setTitle(request.getTitle());
        issue.setDescription(request.getDescription());
        issue.setIssueStatus(status);
        issue.setPriority(request.getPriority() != null ? request.getPriority() : Issue.Priority.MEDIUM);
        issue.setReporter(reporter);
        issue.setAssignee(assignee);
        issue.setEstimatedHours(request.getEstimatedHours());
        issue.setDueDate(request.getDueDate());

        issue = issueRepository.save(issue);
        return convertToDTO(issue);
    }

    @Transactional(readOnly = true)
    public IssueDTO getIssueById(Long issueId, Long userId) {
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy issue"));

        if (issue.getProject() == null) {
            throw new IllegalStateException("Issue không có dự án liên kết");
        }

        validateProjectAccess(issue.getProject().getProjectId(), userId);

        return convertToDTO(issue);
    }

    @Transactional(readOnly = true)
    public List<IssueDTO> getProjectIssues(Long projectId, Long userId) {
        // Validate access
        validateProjectAccess(projectId, userId);

        List<Issue> issues = issueRepository.findByProject_ProjectId(projectId);
        return issues.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<IssueDTO> getProjectIssuesPaginated(Long projectId, Long userId, Pageable pageable) {
        // Validate access
        validateProjectAccess(projectId, userId);
        Page<Issue> issues = issueRepository.findByProject_ProjectId(projectId, pageable);
        return issues.map(this::convertToDTO);
    }

    @Transactional(readOnly = true)
    public List<IssueDTO> getProjectBacklog(Long projectId, Long userId) {
        // Validate access
        validateProjectAccess(projectId, userId);

        List<Issue> issues = issueRepository.findByProject_ProjectIdAndSprintIsNull(projectId);
        return issues.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<IssueDTO> getProjectBacklogPaginated(Long projectId, Long userId, Pageable pageable) {
        // Validate access
        validateProjectAccess(projectId, userId);
        Page<Issue> issues = issueRepository.findByProject_ProjectIdAndSprintIsNull(projectId, pageable);
        return issues.map(this::convertToDTO);
    }

    @Transactional(readOnly = true)
    public List<IssueDTO> getSprintIssues(Long sprintId, Long userId) {
        Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy sprint"));

        if (sprint.getProject() == null) {
            throw new IllegalStateException("Sprint không có dự án liên kết");
        }

        validateProjectAccess(sprint.getProject().getProjectId(), userId);

        List<Issue> issues = issueRepository.findBySprint_SprintId(sprintId);
        return issues.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<IssueDTO> getSprintIssuesPaginated(Long sprintId, Long userId, Pageable pageable) {
        Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy sprint"));

        if (sprint.getProject() == null) {
            throw new IllegalStateException("Sprint không có dự án liên kết");
        }

        validateProjectAccess(sprint.getProject().getProjectId(), userId);
        Page<Issue> issues = issueRepository.findBySprint_SprintId(sprintId, pageable);
        return issues.map(this::convertToDTO);
    }

    @Transactional(readOnly = true)
    public List<IssueDTO> getMyIssues(Long userId) {
        List<Issue> assignedIssues = issueRepository.findByAssignee_UserId(userId);
        return assignedIssues.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<IssueDTO> getMyIssuesPaginated(Long userId, Pageable pageable) {
        Page<Issue> assignedIssues = issueRepository.findByAssignee_UserId(userId, pageable);
        return assignedIssues.map(this::convertToDTO);
    }

    @Transactional(readOnly = true)
    public List<IssueDTO> getMyReportedIssues(Long userId) {
        List<Issue> reportedIssues = issueRepository.findByReporter_UserId(userId);
        return reportedIssues.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public IssueDTO updateIssue(Long issueId, UpdateIssueRequest request, Long userId) {
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy issue"));

        if (issue.getProject() == null) {
            throw new IllegalStateException("Issue không có dự án liên kết");
        }

        validateProjectAccess(issue.getProject().getProjectId(), userId);

        User updater = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy người dùng"));

        StringBuilder changes = new StringBuilder();

        // Update fields if provided
        if (request.getTitle() != null) {
            issue.setTitle(request.getTitle());
        }
        if (request.getDescription() != null) {
            issue.setDescription(request.getDescription());
        }
        if (request.getStatusId() != null) {
            IssueStatus status = issueStatusRepository.findById(request.getStatusId())
                    .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy trạng thái"));
            issue.setIssueStatus(status);
        }
        if (request.getPriority() != null) {
            Issue.Priority oldPriority = issue.getPriority();
            issue.setPriority(request.getPriority());
            if (oldPriority != request.getPriority()) {
                changes.append("Độ ưu tiên: ").append(oldPriority).append(" → ").append(request.getPriority());
            }
        }
        if (request.getAssigneeId() != null) {
            User assignee = userRepository.findById(request.getAssigneeId())
                    .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy người được giao việc"));
            validateProjectAccess(issue.getProject().getProjectId(), request.getAssigneeId());
            issue.setAssignee(assignee);
        }
        if (request.getEstimatedHours() != null) {
            issue.setEstimatedHours(request.getEstimatedHours());
        }
        if (request.getActualHours() != null) {
            issue.setActualHours(request.getActualHours());
        }
        if (request.getDueDate() != null) {
            if (changes.length() > 0)
                changes.append(", ");
            changes.append("Deadline: ").append(request.getDueDate());
            issue.setDueDate(request.getDueDate());
        }

        issue = issueRepository.save(issue);

        // Notify assignee nếu có thay đổi quan trọng (priority, deadline)
        if (changes.length() > 0 && issue.getAssignee() != null && !issue.getAssignee().getUserId().equals(userId)) {
            projectNotificationService.createIssueUpdatedNotification(
                    issue.getAssignee().getUserId(),
                    issue.getTitle(),
                    updater.getUsername(),
                    changes.toString());
        }

        return convertToDTO(issue);
    }

    @Transactional
    public void deleteIssue(Long issueId, Long userId) {
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy issue"));

        // Check if user can manage the project or is the reporter
        Long projectId = issue.getProject().getProjectId();
        ProjectMember member = projectMemberRepository.findByProject_ProjectIdAndUser_UserId(projectId, userId)
                .orElseThrow(() -> new ProjectAccessDeniedException("Bạn không có quyền truy cập dự án này"));

        // Only managers/owners or the reporter can delete
        if (!member.canManageProject() && !issue.getReporter().getUserId().equals(userId)) {
            throw new ForbiddenException("Bạn không có quyền xóa issue này");
        }

        issueRepository.delete(issue);
    }

    @Transactional
    public IssueDTO assignIssue(Long issueId, Long assigneeId, Long userId) {
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy issue"));

        if (issue.getProject() == null) {
            throw new IllegalStateException("Issue không có dự án liên kết");
        }

        validateProjectManagement(issue.getProject().getProjectId(), userId);

        User assignee = userRepository.findById(assigneeId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy người được giao việc"));

        validateProjectAccess(issue.getProject().getProjectId(), assigneeId);

        issue.assignTo(assignee);
        issue = issueRepository.save(issue);

        // Send notification to assignee
        projectNotificationService.createIssueAssignedNotification(
                assigneeId,
                issue.getTitle(),
                issue.getProject().getName());

        // 📱 Push FCM notification to assignee
        try {
            if (assignee.getFcmToken() != null) {
                Map<String, String> data = new HashMap<>();
                data.put("type", "ISSUE_ASSIGNED");
                data.put("issueId", issue.getIssueId().toString());
                data.put("link", "/projects/" + issue.getProject().getProjectId() + "/issues/" + issue.getIssueId());
                fcmService.sendToDevice(
                        assignee.getFcmToken(),
                        "📝 Issue mới được giao",
                        "Bạn được giao issue \"" + issue.getTitle() + "\" trong dự án " + issue.getProject().getName(),
                        data);
            }
        } catch (Exception e) {
            // Log but don't fail the operation
        }

        return convertToDTO(issue);
    }

    @Transactional
    public IssueDTO changeIssueStatus(Long issueId, Integer statusId, Long userId) {
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy issue"));

        if (issue.getProject() == null) {
            throw new IllegalStateException("Issue không có dự án liên kết");
        }

        validateProjectAccess(issue.getProject().getProjectId(), userId);

        // Validate status
        IssueStatus status = issueStatusRepository.findById(statusId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy trạng thái"));

        // Get user for activity log
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy người dùng"));

        // Save old status for activity log
        String oldStatus = issue.getIssueStatus() != null ? issue.getIssueStatus().getName() : "";
        String newStatus = status.getName();

        // Change status
        issue.changeStatus(status);
        issue = issueRepository.save(issue);

        // Create activity log for status change
        if (!oldStatus.equals(newStatus)) {
            IssueActivity activity = new IssueActivity(
                    issue,
                    user,
                    ActivityType.STATUS_CHANGED,
                    "Status",
                    oldStatus,
                    newStatus);
            activity.setDescription(user.getUsername() + " đã thay đổi trạng thái");
            issueActivityRepository.save(activity);
        }

        // Notify assignee về status change
        if (issue.getAssignee() != null && !issue.getAssignee().getUserId().equals(userId)) {
            projectNotificationService.createIssueStatusChangedNotification(
                    issue.getAssignee().getUserId(),
                    issue.getTitle(),
                    status.getName());

            // 📱 Push FCM notification to assignee
            try {
                if (issue.getAssignee().getFcmToken() != null) {
                    Map<String, String> data = new HashMap<>();
                    data.put("type", "ISSUE_STATUS_CHANGED");
                    data.put("issueId", issue.getIssueId().toString());
                    data.put("link",
                            "/projects/" + issue.getProject().getProjectId() + "/issues/" + issue.getIssueId());
                    fcmService.sendToDevice(
                            issue.getAssignee().getFcmToken(),
                            "🔄 Trạng thái issue thay đổi",
                            "Issue \"" + issue.getTitle() + "\" chuyển sang " + status.getName(),
                            data);
                }
            } catch (Exception e) {
                // Log but don't fail the operation
            }
        }

        // 🤖 Auto Phase Status Update
        updatePhaseStatusIfNeeded(issue);

        return convertToDTO(issue);
    }

    // [Tự động cập nhật trạng thái Phase dựa trên Issues] (Role: Internal)
    private void updatePhaseStatusIfNeeded(Issue issue) {
        if (issue.getPhase() == null) {
            return;
        }

        DoAn.BE.project.entity.ProjectPhase phase = issue.getPhase();
        java.util.List<Issue> phaseIssues = issueRepository.findByPhase_PhaseId(phase.getPhaseId());

        if (phaseIssues.isEmpty()) {
            return;
        }

        boolean allDone = true;
        boolean anyInProgress = false;

        for (Issue i : phaseIssues) {
            if (i.getIssueStatus() != null) {
                String statusName = i.getIssueStatus().getName().toLowerCase();
                if (!statusName.contains("done") && !statusName.contains("hoàn thành")
                        && !statusName.contains("closed")) {
                    allDone = false;
                }
                if (statusName.contains("progress") || statusName.contains("đang thực hiện")) {
                    anyInProgress = true;
                }
            } else {
                allDone = false;
            }
        }

        // Update phase status if needed
        if (allDone && phase.getStatus() != DoAn.BE.project.entity.ProjectPhase.PhaseStatus.COMPLETED) {
            phase.setStatus(DoAn.BE.project.entity.ProjectPhase.PhaseStatus.COMPLETED);
            // Note: We need ProjectPhaseRepository here. For simplicity, we'll just update
            // directly.
            // In production, inject ProjectPhaseRepository and save.
        } else if (anyInProgress && phase.getStatus() == DoAn.BE.project.entity.ProjectPhase.PhaseStatus.PLANNING) {
            phase.setStatus(DoAn.BE.project.entity.ProjectPhase.PhaseStatus.IN_PROGRESS);
        }
    }

    // Helper methods
    private void validateProjectAccess(Long projectId, Long userId) {
        projectMemberRepository.findByProject_ProjectIdAndUser_UserId(projectId, userId)
                .orElseThrow(() -> new ProjectAccessDeniedException("Bạn không có quyền truy cập dự án này"));
    }

    private void validateProjectManagement(Long projectId, Long userId) {
        ProjectMember member = projectMemberRepository.findByProject_ProjectIdAndUser_UserId(projectId, userId)
                .orElseThrow(() -> new ProjectAccessDeniedException("Bạn không có quyền truy cập dự án này"));

        if (!member.canManageProject()) {
            throw new ForbiddenException("Bạn không có quyền quản lý dự án này");
        }
    }

    private String generateIssueKey(Project project) {
        // [Optimized] Count existing issues directly from DB
        long count = issueRepository.countByProject_ProjectId(project.getProjectId());
        long nextNumber = count + 1;

        // Generate key: PROJECT_KEY-NUMBER (e.g., PROJ-1, PROJ-2)
        return String.format("%s-%d", project.getKeyProject(), nextNumber);
    }

    private IssueDTO convertToDTO(Issue issue) {
        IssueDTO dto = new IssueDTO();
        dto.setIssueId(issue.getIssueId());

        if (issue.getProject() != null) {
            dto.setProjectId(issue.getProject().getProjectId());
            dto.setProjectName(issue.getProject().getName());
        }

        if (issue.getSprint() != null) {
            dto.setSprintId(issue.getSprint().getSprintId());
            dto.setSprintName(issue.getSprint().getName());
        }

        dto.setIssueKey(issue.getIssueKey());
        dto.setTitle(issue.getTitle());
        dto.setDescription(issue.getDescription());

        if (issue.getIssueStatus() != null) {
            dto.setStatusId(issue.getIssueStatus().getStatusId());
            dto.setStatusName(issue.getIssueStatus().getName());
            dto.setStatusColor(issue.getIssueStatus().getColor());
        }

        dto.setPriority(issue.getPriority());

        if (issue.getReporter() != null) {
            dto.setReporterId(issue.getReporter().getUserId());
            dto.setReporterName(issue.getReporter().getUsername());
        }

        if (issue.getAssignee() != null) {
            dto.setAssigneeId(issue.getAssignee().getUserId());
            dto.setAssigneeName(issue.getAssignee().getUsername());
        }

        dto.setEstimatedHours(issue.getEstimatedHours());
        dto.setActualHours(issue.getActualHours());
        dto.setDueDate(issue.getDueDate());
        dto.setCreatedAt(issue.getCreatedAt());
        dto.setUpdatedAt(issue.getUpdatedAt());
        dto.setIsOverdue(issue.isOverdue());

        return dto;
    }
}
