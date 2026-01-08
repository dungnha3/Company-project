package DoAn.BE.notification.service;

import DoAn.BE.notification.entity.Notification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// [Service quản lý thông báo dự án] (Role: Project System)
@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class ProjectNotificationService {

    private final NotificationService notificationService;

    // ========================= PROJECT NOTIFICATIONS =========================

    // [Tạo notification khi được thêm vào project] (Role: Project)
    public Notification createProjectMemberAddedNotification(Long userId, String projectName, Long projectId) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.PROJECT_ASSIGNED,
                "/projects/" + projectId, projectName);
    }

    // [Tạo notification khi bị xóa khỏi project] (Role: Project)
    public Notification createProjectMemberRemovedNotification(Long userId, String projectName) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.PROJECT_UPDATE,
                "/projects", projectName);
    }

    // [Tạo notification khi project status thay đổi] (Role: Project)
    public Notification createProjectStatusChangedNotification(Long userId, String projectName, String newStatus,
            Long projectId) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.PROJECT_UPDATE,
                "/projects/" + projectId, projectName, newStatus);
    }

    // [Tạo notification khi project hoàn thành] (Role: Project)
    public Notification createProjectCompletedNotification(Long userId, String projectName, Long projectId) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.PROJECT_UPDATE,
                "/projects/" + projectId, projectName);
    }

    // [Tạo notification khi project bị archive/delete] (Role: Project)
    public Notification createProjectArchivedNotification(Long userId, String projectName) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.PROJECT_UPDATE,
                "/projects", projectName);
    }

    // [Tạo notification khi role thay đổi trong project] (Role: Project)
    public Notification createProjectRoleChangedNotification(Long userId, String projectName, String newRole,
            Long projectId) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.PROJECT_UPDATE,
                "/projects/" + projectId, projectName, newRole);
    }

    // ========================= ISSUE NOTIFICATIONS =========================

    // [Tạo notification khi issue được assign] (Role: Issue)
    public Notification createIssueAssignedNotification(Long userId, String issueTitle, String projectName) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.PROJECT_ISSUE,
                "/projects/issues", issueTitle, projectName);
    }

    // [Tạo notification khi có comment mới trên issue] (Role: Issue)
    public Notification createIssueCommentNotification(Long userId, String commenterName, String issueTitle) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.PROJECT_ISSUE,
                "/projects/issues", commenterName, issueTitle);
    }

    // [Tạo notification khi issue thay đổi status] (Role: Issue)
    public Notification createIssueStatusChangedNotification(Long userId, String issueTitle, String newStatus) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.PROJECT_ISSUE,
                "/projects/issues", issueTitle, newStatus);
    }

    // [Tạo notification khi issue bị overdue] (Role: Issue)
    public Notification createIssueOverdueNotification(Long userId, String issueTitle, String issueKey) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.PROJECT_ISSUE,
                "/projects/issues/" + issueKey, issueTitle, issueKey);
    }

    // [Tạo notification khi issue được update] (Role: Issue)
    public Notification createIssueUpdatedNotification(Long userId, String issueTitle, String updaterName,
            String changeDescription) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.PROJECT_ISSUE,
                "/projects/issues", updaterName, issueTitle, changeDescription);
    }

    // ========================= SPRINT NOTIFICATIONS =========================

    // [Tạo notification khi sprint bắt đầu] (Role: Sprint)
    public Notification createSprintStartedNotification(Long userId, String sprintName, Long projectId) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.PROJECT_SPRINT,
                "/projects/" + projectId + "/sprints", sprintName);
    }

    // [Tạo notification khi sprint sắp kết thúc (3 ngày trước)] (Role: Sprint)
    public Notification createSprintEndingNotification(Long userId, String sprintName, String endDate, Long projectId) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.PROJECT_SPRINT,
                "/projects/" + projectId + "/sprints", sprintName, endDate);
    }

    // [Tạo notification khi sprint hoàn thành] (Role: Sprint)
    public Notification createSprintCompletedNotification(Long userId, String sprintName, int completedIssues,
            int totalIssues, Long projectId) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.PROJECT_SPRINT,
                "/projects/" + projectId + "/sprints", sprintName, completedIssues, totalIssues,
                totalIssues > 0 ? (completedIssues * 100.0 / totalIssues) : 0);
    }
}
