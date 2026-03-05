package DoAn.BE.notification.service;

import DoAn.BE.notification.entity.Notification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class ProjectNotificationService {

        private final NotificationService notificationService;
        public Notification createProjectMemberAddedNotification(Long userId, String projectName, Long projectId) {
                return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.PROJECT_ASSIGNED,
                                "/projects/" + projectId, projectName);
        }
        public Notification createProjectMemberRemovedNotification(Long userId, String projectName) {
                return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.PROJECT_UPDATE,
                                "/projects", projectName);
        }
        public Notification createProjectStatusChangedNotification(Long userId, String projectName, String newStatus,
                        Long projectId) {
                return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.PROJECT_UPDATE,
                                "/projects/" + projectId, projectName, newStatus);
        }
        public Notification createProjectCompletedNotification(Long userId, String projectName, Long projectId) {
                return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.PROJECT_UPDATE,
                                "/projects/" + projectId, projectName);
        }
        public Notification createProjectArchivedNotification(Long userId, String projectName) {
                return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.PROJECT_UPDATE,
                                "/projects", projectName);
        }
        public Notification createProjectRoleChangedNotification(Long userId, String projectName, String newRole,
                        Long projectId) {
                return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.PROJECT_UPDATE,
                                "/projects/" + projectId, projectName, newRole);
        }
        public Notification createIssueAssignedNotification(Long userId, String issueTitle, String projectName) {
                return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.PROJECT_ISSUE,
                                "/projects/issues", issueTitle, projectName);
        }
        public Notification createIssueCommentNotification(Long userId, String commenterName, String issueTitle) {
                return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.PROJECT_ISSUE,
                                "/projects/issues", commenterName, issueTitle);
        }
        public Notification createIssueCommentEditedNotification(Long userId, String editorName, String issueTitle) {
                return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.PROJECT_ISSUE,
                                "/projects/issues", editorName, issueTitle, "edited their comment");
        }
        public Notification createIssueCommentDeletedNotification(Long userId, String deleterName, String issueTitle) {
                return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.PROJECT_ISSUE,
                                "/projects/issues", deleterName, issueTitle, "deleted their comment");
        }
        public Notification createIssueStatusChangedNotification(Long userId, String issueTitle, String newStatus) {
                return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.PROJECT_ISSUE,
                                "/projects/issues", issueTitle, newStatus);
        }
        public Notification createIssueOverdueNotification(Long userId, String issueTitle, String issueKey) {
                return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.PROJECT_ISSUE,
                                "/projects/issues/" + issueKey, issueTitle, issueKey);
        }
        public Notification createIssueUpdatedNotification(Long userId, String issueTitle, String updaterName,
                        String changeDescription) {
                return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.PROJECT_ISSUE,
                                "/projects/issues", updaterName, issueTitle, changeDescription);
        }
        public Notification createIssueDeletedNotification(Long userId, String issueTitle, String issueKey,
                        Long projectId) {
                return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.PROJECT_ISSUE,
                                "/projects/" + projectId + "/issues", issueTitle, issueKey + " (Deleted)");
        }
        public Notification createSprintStartedNotification(Long userId, String sprintName, Long projectId) {
                return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.PROJECT_SPRINT,
                                "/projects/" + projectId + "/sprints", sprintName);
        }
        public Notification createSprintEndingNotification(Long userId, String sprintName, String endDate,
                        Long projectId) {
                return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.PROJECT_SPRINT,
                                "/projects/" + projectId + "/sprints", sprintName, endDate);
        }
        public Notification createSprintCompletedNotification(Long userId, String sprintName, int completedIssues,
                        int totalIssues, Long projectId) {
                return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.PROJECT_SPRINT,
                                "/projects/" + projectId + "/sprints", sprintName, completedIssues, totalIssues,
                                totalIssues > 0 ? (completedIssues * 100.0 / totalIssues) : 0);
        }
}
