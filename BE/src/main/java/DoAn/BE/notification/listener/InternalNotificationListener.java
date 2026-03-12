package DoAn.BE.notification.listener;

import DoAn.BE.hrm.event.HrmEvent;
import DoAn.BE.notification.service.HRNotificationService;
import DoAn.BE.notification.service.EmailNotificationService;
import DoAn.BE.project.event.ProjectEvent;
import DoAn.BE.auth.event.AuthEvent;
import DoAn.BE.notification.service.AuthNotificationService;
import DoAn.BE.notification.service.AttendanceNotificationService;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
@Slf4j
public class InternalNotificationListener {

    private final HRNotificationService hrNotificationService;
    private final AttendanceNotificationService attendanceNotificationService;
    private final AuthNotificationService authNotificationService;
    private final DoAn.BE.notification.service.ProjectNotificationService projectNotificationService;
    private final DoAn.BE.project.repository.ProjectMemberRepository projectMemberRepository;
    private final DoAn.BE.project.service.ProjectChatIntegrationService projectChatIntegrationService;
    private final EmailNotificationService emailNotificationService;
    private final UserRepository userRepository;

    // entities
    @Async("notificationExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleProjectEvent(ProjectEvent event) {
        log.info("Handling internal notification for Project Event: {}", event.getType());
        DoAn.BE.project.dto.ProjectDTO project = event.getProject();
        Long actorId = event.getActorId();

        switch (event.getType()) {
            case MEMBER_ADDED:
                if (event.getPayload() instanceof DoAn.BE.project.dto.ProjectMemberDTO) {
                    DoAn.BE.project.dto.ProjectMemberDTO member = (DoAn.BE.project.dto.ProjectMemberDTO) event
                            .getPayload();
                    if (member.getUserId() != null && !member.getUserId().equals(actorId)) {
                        // 1. Chat Notification
                        projectChatIntegrationService.notifyMemberAdded(
                                convertDTOToEntity(project), member.getUsername(), member.getRole().toString());

                        // 2. Bell Notification
                        projectNotificationService.createProjectMemberAddedNotification(
                                member.getUserId(), project.getName(), project.getProjectId());

                        // 3. Email Notification
                        sendProjectMemberAddedEmail(member.getUserId(), member.getEmail(),
                                member.getUsername(), project.getName(), project.getProjectId());
                    }
                }
                break;
            case MEMBER_REMOVED:
                if (event.getPayload() instanceof DoAn.BE.project.dto.ProjectMemberDTO) {
                    DoAn.BE.project.dto.ProjectMemberDTO member = (DoAn.BE.project.dto.ProjectMemberDTO) event
                            .getPayload();
                    if (member.getUserId() != null) {
                        // 1. Chat Notification
                        projectChatIntegrationService.notifyMemberRemoved(
                                convertDTOToEntity(project), member.getUsername());

                        // 2. Bell Notification
                        projectNotificationService.createProjectMemberRemovedNotification(
                                member.getUserId(), project.getName());
                    }
                }
                break;
            case COMPLETED:
                // 1. Chat Notification
                projectChatIntegrationService.notifyProjectCompleted(convertDTOToEntity(project));

                // 2. Notify All Members
                notifyProjectMembers(project.getProjectId(),
                        (userId) -> {
                            if (!userId.equals(actorId)) {
                                projectNotificationService.createProjectCompletedNotification(
                                        userId, project.getName(), project.getProjectId());
                            }
                        });
                break;
            case STATUS_CHANGED:
                // 1. Chat Notification ("Status changed") - Need verify payload or reconstruct
                // Simplification: We don't have old status in event easily without payload.
                // Let's assume generic "Update" or skip strict old/new comparison for chat here
                // UNLESS we pass it in payload.

                // For Bell Notification:
                notifyProjectMembers(project.getProjectId(),
                        (userId) -> {
                            if (!userId.equals(actorId)) {
                                String statusText = project.getStatus() != null ? project.getStatus().toString()
                                        : "Updated";
                                projectNotificationService.createProjectStatusChangedNotification(
                                        userId, project.getName(), statusText, project.getProjectId());
                            }
                        });
                break;
            case ROLE_CHANGED:
                if (event.getPayload() instanceof DoAn.BE.project.dto.ProjectMemberDTO) {
                    DoAn.BE.project.dto.ProjectMemberDTO member = (DoAn.BE.project.dto.ProjectMemberDTO) event
                            .getPayload();
                    if (member.getUserId() != null && !member.getUserId().equals(actorId)) {
                        projectNotificationService.createProjectRoleChangedNotification(
                                member.getUserId(), project.getName(), member.getRole().toString(),
                                project.getProjectId());
                    }
                }
                break;
            case DELETED:
                notifyProjectMembers(project.getProjectId(),
                        (userId) -> {
                            if (!userId.equals(actorId)) {
                                projectNotificationService.createProjectArchivedNotification(
                                        userId, project.getName());
                            }
                        });
                break;
            default:
                break;
        }
    }

    private DoAn.BE.project.entity.Project convertDTOToEntity(DoAn.BE.project.dto.ProjectDTO dto) {
        DoAn.BE.project.entity.Project p = new DoAn.BE.project.entity.Project();
        p.setProjectId(dto.getProjectId());
        p.setName(dto.getName());
        return p;
    }

    @Async("notificationExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleHrmEvent(HrmEvent event) {
        log.info("Handling internal notification for HRM Event: {}", event.getType());

        switch (event.getType()) {
            case LEAVE_APPROVED:
                handleLeaveApproved(event);
                break;
            case LEAVE_REJECTED: // Assuming Type exists or will be mapped
                // handleLeaveRejected(event);
                break;
            case ATTENDANCE_LATE:
                handleAttendanceLate(event);
                break;
            case CONTRACT_CREATED:
                break;
            case CONTRACT_EXPIRING:
                handleContractExpiring(event);
                break;
            case CHECKOUT_REMINDER:
                attendanceNotificationService.createCheckoutReminderNotification(event.getActorId());
                break;
            case MISSING_ATTENDANCE:
                if (event.getEntity() instanceof String) {
                    attendanceNotificationService.createMissingAttendanceNotification(
                            event.getActorId(), (String) event.getEntity());
                }
                break;
            case MONTHLY_SUMMARY:
                if (event.getEntity() instanceof int[]) {
                    int[] data = (int[]) event.getEntity();
                    attendanceNotificationService.createMonthlyAttendanceSummaryNotification(
                            event.getActorId(), event.getDescription(), data[0], data[1], data[2]);
                }
                break;
            default:
                break;
        }
    }

    private void handleLeaveApproved(HrmEvent event) {
        Object payload = event.getEntity();
        if (payload instanceof DoAn.BE.hrm.entity.LeaveRequest) {
            DoAn.BE.hrm.entity.LeaveRequest req = (DoAn.BE.hrm.entity.LeaveRequest) payload;
            if (req.getEmployee() != null && req.getEmployee().getUser() != null) {
                hrNotificationService.createLeaveApprovedNotification(
                        req.getEmployee().getUser().getUserId(),
                        req.getStartDate().toString(),
                        req.getEndDate().toString());
            }
        }
    }

    private void handleAttendanceLate(HrmEvent event) {
        if (event.getEntity() instanceof String) {
            attendanceNotificationService.createCheckinLateNotification(
                    event.getActorId(),
                    (String) event.getEntity());
        }
    }

    private void handleContractExpiring(HrmEvent event) {
        if (event.getEntity() instanceof DoAn.BE.hrm.entity.Contract) {
            DoAn.BE.hrm.entity.Contract contract = (DoAn.BE.hrm.entity.Contract) event.getEntity();
            // Notify Employee
            if (contract.getEmployee() != null && contract.getEmployee().getUser() != null) {
                hrNotificationService.createContractExpiringNotification(
                        contract.getEmployee().getUser().getUserId(),
                        contract.getEmployee().getFullName(),
                        contract.getEndDate().toString());
            }
        }
    }

    @Async("notificationExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleAuthEvent(AuthEvent event) {
        log.info("Handling internal notification for Auth Event: {}", event.getType());
        switch (event.getType()) {
            case LOGIN_NEW_DEVICE:
                // ip, userAgent)
                // generic string.
                authNotificationService.createNewLoginNotification(
                        event.getUserId(),
                        (String) event.getPayload(), // IP Address
                        "Unknown Device" // Start with generic, improve if AuthEvent carries UA
                );
                break;
            case PASSWORD_RESET_REQUESTED:
                if (event.getPayload() instanceof String) {
                    authNotificationService.sendPasswordResetNotification(
                            event.getUserId(),
                            (String) event.getPayload() // Reset info/Token
                    );
                }
                break;
            case SECURITY_ALERT:
            case ACCOUNT_LOCKED:
                authNotificationService.createSecurityAlertNotification(
                        event.getUserId(),
                        event.getDescription(), // Title
                        (String) event.getPayload() // Content
                );
                break;
            default:
                break;
        }
    }

    @Async("notificationExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleIssueEvent(DoAn.BE.project.event.IssueEvent event) {
        log.info("Handling internal notification for Issue Event: {}", event.getEventType());
        DoAn.BE.project.entity.Issue issue = event.getIssue();
        if (issue == null)
            return;

        Long actorId = event.getActorId();

        switch (event.getEventType()) {
            case ASSIGNED:
                if (issue.getAssignee() != null && !issue.getAssignee().getUserId().equals(actorId)) {
                    projectNotificationService.createIssueAssignedNotification(
                            issue.getAssignee().getUserId(),
                            issue.getTitle(),
                            issue.getProject().getName());

                    // Email Notification
                    sendIssueAssignedEmail(issue.getAssignee(), issue.getTitle(),
                            issue.getProject().getName(), issue.getIssueKey());
                }
                break;
            case STATUS_CHANGED:
                handleIssueStatusChanged(issue, actorId);
                break;
            case COMMENT_ADDED:
                handleIssueComment(issue, actorId);
                break;
            case UPDATED:
                // If critical key fields updated, notify assignee (if not actor)
                break;
            case OVERDUE:
                if (issue.getAssignee() != null) {
                    projectNotificationService.createIssueOverdueNotification(
                            issue.getAssignee().getUserId(),
                            issue.getTitle(),
                            issue.getIssueKey());
                }
                break;
            case DEADLINE_APPROACHING:
                if (issue.getAssignee() != null) {
                    projectNotificationService.createIssueUpdatedNotification(
                            issue.getAssignee().getUserId(),
                            issue.getTitle(),
                            "System", // or actorName if available? IssueEvent actorId is null.
                            "Deadline sắp tới: " + issue.getDueDate());
                }
                break;
            case COMMENT_EDITED:
                if (issue.getAssignee() != null && !issue.getAssignee().getUserId().equals(actorId)) {
                    projectNotificationService.createIssueCommentEditedNotification(
                            issue.getAssignee().getUserId(),
                            "Someone",
                            issue.getTitle());
                }
                if (issue.getReporter() != null
                        && !issue.getReporter().getUserId().equals(actorId)
                        && (issue.getAssignee() == null
                                || !issue.getAssignee().getUserId().equals(issue.getReporter().getUserId()))) {
                    projectNotificationService.createIssueCommentEditedNotification(
                            issue.getReporter().getUserId(),
                            "Someone",
                            issue.getTitle());
                }
                break;
            case COMMENT_DELETED:
                if (issue.getAssignee() != null && !issue.getAssignee().getUserId().equals(actorId)) {
                    projectNotificationService.createIssueCommentDeletedNotification(
                            issue.getAssignee().getUserId(),
                            "Someone",
                            issue.getTitle());
                }
                if (issue.getReporter() != null
                        && !issue.getReporter().getUserId().equals(actorId)
                        && (issue.getAssignee() == null
                                || !issue.getAssignee().getUserId().equals(issue.getReporter().getUserId()))) {
                    projectNotificationService.createIssueCommentDeletedNotification(
                            issue.getReporter().getUserId(),
                            "Someone",
                            issue.getTitle());
                }
                break;
            case DELETED:
                // Notify Assignee
                if (issue.getAssignee() != null && !issue.getAssignee().getUserId().equals(actorId)) {
                    projectNotificationService.createIssueDeletedNotification(
                            issue.getAssignee().getUserId(),
                            issue.getTitle(),
                            issue.getIssueKey(),
                            issue.getProject().getProjectId());
                }
                // Notify Reporter (if different from actor and assignee)
                if (issue.getReporter() != null
                        && !issue.getReporter().getUserId().equals(actorId)
                        && (issue.getAssignee() == null
                                || !issue.getAssignee().getUserId().equals(issue.getReporter().getUserId()))) {

                    projectNotificationService.createIssueDeletedNotification(
                            issue.getReporter().getUserId(),
                            issue.getTitle(),
                            issue.getIssueKey(),
                            issue.getProject().getProjectId());
                }
                break;
            default:
                break;
        }
    }

    @Async("notificationExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleSprintEvent(DoAn.BE.project.event.SprintEvent event) {
        log.info("Handling internal notification for Sprint Event: {}", event.getType());
        DoAn.BE.project.dto.SprintDTO sprint = event.getSprint();
        if (sprint == null)
            return;

        switch (event.getType()) {
            case STARTED:
                notifyProjectMembers(sprint.getProjectId(),
                        (userId) -> projectNotificationService.createSprintStartedNotification(
                                userId, sprint.getName(), sprint.getProjectId()));
                break;
            case COMPLETED:
                notifyProjectMembers(sprint.getProjectId(),
                        (userId) -> projectNotificationService.createSprintCompletedNotification(
                                userId, sprint.getName(), sprint.getCompletedIssues(),
                                sprint.getTotalIssues(), sprint.getProjectId()));
                break;
            case ENDING_SOON:
                java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter
                        .ofPattern("dd/MM/yyyy");
                String endDateStr = sprint.getEndDate() != null ? sprint.getEndDate().format(formatter) : "N/A";
                notifyProjectMembers(sprint.getProjectId(),
                        (userId) -> projectNotificationService.createSprintEndingNotification(
                                userId, sprint.getName(), endDateStr, sprint.getProjectId()));
                break;
            default:
                break;
        }
    }

    private void handleIssueStatusChanged(DoAn.BE.project.entity.Issue issue, Long actorId) {
        String statusName = issue.getIssueStatus().getName();
        if (issue.getAssignee() != null && !issue.getAssignee().getUserId().equals(actorId)) {
            projectNotificationService.createIssueStatusChangedNotification(
                    issue.getAssignee().getUserId(), issue.getTitle(), statusName);
        }
        if (issue.getReporter() != null && !issue.getReporter().getUserId().equals(actorId)
                && (issue.getAssignee() == null
                        || !issue.getReporter().getUserId().equals(issue.getAssignee().getUserId()))) {
            projectNotificationService.createIssueStatusChangedNotification(
                    issue.getReporter().getUserId(), issue.getTitle(), statusName);
        }
    }

    private void handleIssueComment(DoAn.BE.project.entity.Issue issue, Long actorId) {
        // We use a generic message like "New comment on issue X" since we don't have
        // commenter name easily without IO
        // Or we could rely on the fact that actorId is the commenter.
        // We still need the username for the notification text "User X commented..."
        // projectNotificationService.createIssueCommentNotification(userId,
        // commenterName, title)
        // We can fetch the actor's name if we inject UserRepository, or just use
        // "Someone".
        // Let's use "Someone" for now to avoid IO, or if critical, we can inject
        // UserRepository.

        String commenterName = "Someone"; // To be improved if UserRepo injected

        if (issue.getAssignee() != null && !issue.getAssignee().getUserId().equals(actorId)) {
            projectNotificationService.createIssueCommentNotification(
                    issue.getAssignee().getUserId(), commenterName, issue.getTitle());
        }

        if (issue.getReporter() != null && !issue.getReporter().getUserId().equals(actorId)
                && (issue.getAssignee() == null
                        || !issue.getReporter().getUserId().equals(issue.getAssignee().getUserId()))) {
            projectNotificationService.createIssueCommentNotification(
                    issue.getReporter().getUserId(), commenterName, issue.getTitle());
        }
    }

    private void notifyProjectMembers(Long projectId, java.util.function.Consumer<Long> notificationAction) {
        java.util.List<DoAn.BE.project.entity.ProjectMember> members = projectMemberRepository
                .findByProject_ProjectId(projectId);
        for (DoAn.BE.project.entity.ProjectMember member : members) {
            if (member.getUser() != null) {
                notificationAction.accept(member.getUser().getUserId());
            }
        }
    }

    /**
     * Gửi email khi thêm thành viên vào dự án.
     * Kiểm tra user preferences trước khi gửi.
     */
    private void sendProjectMemberAddedEmail(Long userId, String emailFromDTO, String username,
            String projectName, Long projectId) {
        try {
            String email = emailFromDTO;
            // Nếu DTO không có email, lấy từ UserRepository
            if (email == null || email.trim().isEmpty()) {
                User user = userRepository.findById(userId).orElse(null);
                if (user == null || user.getEmail() == null || user.getEmail().trim().isEmpty()) {
                    return;
                }
                email = user.getEmail();
                // Kiểm tra user notification preferences
                if (user.getNotificationSettings() != null
                        && Boolean.FALSE.equals(user.getNotificationSettings().getEmailProjectUpdates())) {
                    log.debug("User {} đã tắt email thông báo dự án, bỏ qua", userId);
                    return;
                }
            } else {
                // Kiểm tra notification preferences khi đã có email từ DTO
                User user = userRepository.findById(userId).orElse(null);
                if (user != null && user.getNotificationSettings() != null
                        && Boolean.FALSE.equals(user.getNotificationSettings().getEmailProjectUpdates())) {
                    log.debug("User {} đã tắt email thông báo dự án, bỏ qua", userId);
                    return;
                }
            }
            emailNotificationService.sendProjectMemberAddedEmail(email, username, projectName, projectId);
        } catch (Exception e) {
            log.error("Lỗi gửi email thêm vào dự án cho user {}: {}", userId, e.getMessage());
        }
    }

    /**
     * Gửi email khi giao công việc.
     * Kiểm tra user preferences trước khi gửi.
     */
    private void sendIssueAssignedEmail(User assignee, String issueTitle, String projectName, String issueKey) {
        try {
            if (assignee.getEmail() == null || assignee.getEmail().trim().isEmpty()) {
                return;
            }
            // Kiểm tra notification preferences
            if (assignee.getNotificationSettings() != null
                    && Boolean.FALSE.equals(assignee.getNotificationSettings().getEmailProjectUpdates())) {
                log.debug("User {} đã tắt email thông báo dự án, bỏ qua", assignee.getUserId());
                return;
            }
            emailNotificationService.sendIssueAssignedEmail(
                    assignee.getEmail(), assignee.getUsername(), issueTitle, projectName, issueKey);
        } catch (Exception e) {
            log.error("Lỗi gửi email giao công việc cho user {}: {}", assignee.getUserId(), e.getMessage());
        }
    }
}
