package DoAn.BE.notification.service;

import DoAn.BE.notification.entity.Notification;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
@Transactional
@RequiredArgsConstructor
public class StorageNotificationService {

    private final NotificationService notificationService;
    public Notification createFileSharedNotification(Long receiverId, String senderName, String filename) {
        return notificationService.send(receiverId, DoAn.BE.notification.entity.NotificationType.STORAGE_UPDATE,
                "/storage/shared", senderName, filename);
    }
    public Notification createQuotaWarningNotification(Long userId, int percentUsed) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.STORAGE_QUOTA,
                "/storage/stats", percentUsed);
    }
    public Notification createQuotaExceededNotification(Long userId) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.STORAGE_QUOTA,
                "/storage/stats");
    }
    public Notification createFileDeletedNotification(Long userId, String filename, String ownerName) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.STORAGE_UPDATE,
                "/storage/shared", ownerName, filename);
    }
    public Notification createFolderSharedNotification(Long receiverId, String senderName, String folderName) {
        return notificationService.send(receiverId, DoAn.BE.notification.entity.NotificationType.STORAGE_UPDATE,
                "/storage/shared", senderName, folderName);
    }
    public Notification createProjectFileUploadedNotification(Long userId, String uploaderName, String filename,
            Long projectId, String projectName) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.STORAGE_UPDATE,
                "/projects/" + projectId + "/files", uploaderName, filename, projectName);
    }
}
