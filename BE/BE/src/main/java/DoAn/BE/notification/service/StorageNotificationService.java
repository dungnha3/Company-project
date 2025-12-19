package DoAn.BE.notification.service;

import DoAn.BE.notification.entity.Notification;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// Service quản lý thông báo storage (file, folder, quota)
@Service
@Transactional
@RequiredArgsConstructor
public class StorageNotificationService {

    private final NotificationService notificationService;
    
    /**
     * Tạo notification khi upload file thành công
     */
    public Notification createFileUploadNotification(Long userId, String filename, String fileSize) {
        String title = "Upload file thành công";
        String content = "File \"" + filename + "\" (" + fileSize + ") đã được upload thành công";
        String link = "/storage/files";
        return notificationService.createNotification(userId, "STORAGE_UPLOAD", title, content, link);
    }
    
    /**
     * Tạo notification khi có người share file
     */
    public Notification createFileSharedNotification(Long receiverId, String senderName, String filename) {
        String title = "File được chia sẻ";
        String content = senderName + " đã chia sẻ file \"" + filename + "\" với bạn";
        String link = "/storage/shared";
        return notificationService.createNotification(receiverId, "STORAGE_FILE_SHARED", title, content, link);
    }
    
    /**
     * Tạo notification cảnh báo quota
     */
    public Notification createQuotaWarningNotification(Long userId, int percentUsed) {
        String title = "Cảnh báo dung lượng";
        String content = "Bạn đã sử dụng " + percentUsed + "% dung lượng. Vui lòng xóa bớt file hoặc yêu cầu tăng quota";
        String link = "/storage/stats";
        return notificationService.createNotification(userId, "STORAGE_QUOTA_WARNING", title, content, link);
    }
    
    /**
     * Tạo notification khi hết quota
     */
    public Notification createQuotaExceededNotification(Long userId) {
        String title = "Hết dung lượng";
        String content = "Bạn đã sử dụng hết dung lượng. Vui lòng xóa bớt file hoặc liên hệ admin";
        String link = "/storage/stats";
        return notificationService.createNotification(userId, "STORAGE_QUOTA_EXCEEDED", title, content, link);
    }
    
    /**
     * Tạo notification khi file bị xóa (nếu đã shared)
     */
    public Notification createFileDeletedNotification(Long userId, String filename, String ownerName) {
        String title = "File đã bị xóa";
        String content = ownerName + " đã xóa file \"" + filename + "\" đã được chia sẻ với bạn";
        String link = "/storage/shared";
        return notificationService.createNotification(userId, "STORAGE_FILE_DELETED", title, content, link);
    }
    
    /**
     * Tạo notification khi folder được share
     */
    public Notification createFolderSharedNotification(Long receiverId, String senderName, String folderName) {
        String title = "Thư mục được chia sẻ";
        String content = senderName + " đã chia sẻ thư mục \"" + folderName + "\" với bạn";
        String link = "/storage/shared";
        return notificationService.createNotification(receiverId, "STORAGE_FOLDER_SHARED", title, content, link);
    }
    
    /**
     * Tạo notification khi có file mới trong project
     */
    public Notification createProjectFileUploadedNotification(Long userId, String uploaderName, String filename, Long projectId, String projectName) {
        String title = "File mới trong dự án";
        String content = uploaderName + " đã upload file \"" + filename + "\" vào dự án \"" + projectName + "\"";
        String link = "/projects/" + projectId + "/files";
        return notificationService.createNotification(userId, "PROJECT_FILE_UPLOADED", title, content, link);
    }
}
