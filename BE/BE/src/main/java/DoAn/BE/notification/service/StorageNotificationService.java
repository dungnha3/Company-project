package DoAn.BE.notification.service;

import DoAn.BE.notification.entity.Notification;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// [Service thông báo storage - file, folder, quota] (Role: System)
@Service
@Transactional
@RequiredArgsConstructor
public class StorageNotificationService {

    private final NotificationService notificationService;

    // [Thông báo upload file thành công] (Role: System)
    public Notification createFileUploadNotification(Long userId, String filename, String fileSize) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.STORAGE_UPDATE,
                "/storage/files", filename, fileSize);
    }

    // [Thông báo file được chia sẻ] (Role: System)
    public Notification createFileSharedNotification(Long receiverId, String senderName, String filename) {
        return notificationService.send(receiverId, DoAn.BE.notification.entity.NotificationType.STORAGE_UPDATE,
                "/storage/shared", senderName, filename);
    }

    // [Thông báo cảnh báo dung lượng] (Role: System)
    public Notification createQuotaWarningNotification(Long userId, int percentUsed) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.STORAGE_QUOTA,
                "/storage/stats", percentUsed);
    }

    // [Thông báo hết dung lượng] (Role: System)
    public Notification createQuotaExceededNotification(Long userId) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.STORAGE_QUOTA,
                "/storage/stats");
    }

    // [Thông báo file đã bị xóa] (Role: System)
    public Notification createFileDeletedNotification(Long userId, String filename, String ownerName) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.STORAGE_UPDATE,
                "/storage/shared", ownerName, filename);
    }

    // [Thông báo folder được chia sẻ] (Role: System)
    public Notification createFolderSharedNotification(Long receiverId, String senderName, String folderName) {
        return notificationService.send(receiverId, DoAn.BE.notification.entity.NotificationType.STORAGE_UPDATE,
                "/storage/shared", senderName, folderName);
    }

    // [Thông báo file mới trong project] (Role: System)
    public Notification createProjectFileUploadedNotification(Long userId, String uploaderName, String filename,
            Long projectId, String projectName) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.STORAGE_UPDATE,
                "/projects/" + projectId + "/files", uploaderName, filename, projectName);
    }
}
