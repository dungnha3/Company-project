package DoAn.BE.notification.service;

import DoAn.BE.notification.repository.NotificationRepository;
import DoAn.BE.notification.repository.ThongBaoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Service tự động dọn dẹp notifications cũ
 * Chạy hàng ngày lúc 2:00 AM để xóa notifications cũ hơn retention period
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationCleanupService {

    private final NotificationRepository notificationRepository;
    private final ThongBaoRepository thongBaoRepository;

    @Value("${notification.retention.days:30}")
    private int retentionDays;

    /**
     * Xóa notifications cũ hơn retention period (mặc định 30 ngày)
     * Chạy mỗi ngày lúc 2:00 AM
     */
    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void cleanupOldNotifications() {
        log.info("🧹 Bắt đầu dọn dẹp notifications cũ (retention: {} ngày)...", retentionDays);

        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(retentionDays);

        try {
            // Đếm trước khi xóa để log
            long notificationCount = notificationRepository.countOlderThan(cutoffDate);
            long thongBaoCount = thongBaoRepository.countOlderThan(cutoffDate);

            log.info("📊 Tìm thấy {} notifications và {} thông báo cũ cần xóa",
                    notificationCount, thongBaoCount);

            if (notificationCount > 0 || thongBaoCount > 0) {
                // Xóa Notification entities
                int deletedNotifications = notificationRepository.deleteOlderThan(cutoffDate);
                log.info("✅ Đã xóa {} notifications từ bảng Notification", deletedNotifications);

                // Xóa ThongBao entities
                int deletedThongBao = thongBaoRepository.deleteOlderThan(cutoffDate);
                log.info("✅ Đã xóa {} thông báo từ bảng ThongBao", deletedThongBao);

                log.info("🎉 Hoàn tất dọn dẹp: {} tổng records đã xóa",
                        deletedNotifications + deletedThongBao);
            } else {
                log.info("✨ Không có notifications cũ cần xóa");
            }
        } catch (Exception e) {
            log.error("❌ Lỗi khi dọn dẹp notifications: {}", e.getMessage(), e);
        }
    }

    /**
     * Manual cleanup - có thể gọi từ Admin API
     * 
     * @param days số ngày retention
     * @return số records đã xóa
     */
    @Transactional
    public int manualCleanup(int days) {
        log.info("🧹 Manual cleanup: xóa notifications cũ hơn {} ngày", days);

        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(days);

        int deletedNotifications = notificationRepository.deleteOlderThan(cutoffDate);
        int deletedThongBao = thongBaoRepository.deleteOlderThan(cutoffDate);

        int total = deletedNotifications + deletedThongBao;
        log.info("✅ Manual cleanup hoàn tất: {} records đã xóa", total);

        return total;
    }
}
