package DoAn.BE.notification.service;

import DoAn.BE.notification.repository.NotificationRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationCleanupService {

    private final NotificationRepository notificationRepository;

    @Value("${notification.retention.days:30}")
    private int retentionDays;

    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void cleanupOldNotifications() {
        log.info("Bắt đầu dọn dẹp notifications cũ (retention: {} ngày)...", retentionDays);

        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(retentionDays);

        try {
            long notificationCount = notificationRepository.countOlderThan(cutoffDate);

            log.info("Tìm thấy {} notifications cũ cần xóa", notificationCount);

            if (notificationCount > 0) {
                int deletedNotifications = notificationRepository.deleteOlderThan(cutoffDate);
                log.info("Đã xóa {} notifications từ bảng Notification", deletedNotifications);
            } else {
                log.info("Không có notifications cũ cần xóa");
            }
        } catch (Exception e) {
            log.error("Lỗi khi dọn dẹp notifications: {}", e.getMessage(), e);
        }
    }

    @Transactional
    public int manualCleanup(int days) {
        log.info("Manual cleanup: xóa notifications cũ hơn {} ngày", days);

        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(days);

        int deletedNotifications = notificationRepository.deleteOlderThan(cutoffDate);
        log.info("Manual cleanup hoàn tất: {} records đã xóa", deletedNotifications);

        return deletedNotifications;
    }
}
