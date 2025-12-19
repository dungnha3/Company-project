package DoAn.BE.notification.repository;

import DoAn.BE.notification.entity.Notification;
import DoAn.BE.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

// Repository cho thông báo đơn giản
@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    // Lấy tất cả notification của user
    List<Notification> findByUser_UserIdOrderByCreatedAtDesc(Long userId);

    // Lấy notification của user với pagination (using User object)
    Page<Notification> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);

    // Lấy notification của user với pagination (using userId - CONSISTENT with
    // count method)
    Page<Notification> findByUser_UserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    // Đếm notification chưa đọc
    long countByUser_UserIdAndIsReadFalse(Long userId);

    // Xóa notifications cũ hơn một ngày nhất định (cho cleanup job)
    @Modifying
    @Query("DELETE FROM Notification n WHERE n.createdAt < :cutoffDate")
    int deleteOlderThan(LocalDateTime cutoffDate);

    // Đếm notifications cũ (để log)
    @Query("SELECT COUNT(n) FROM Notification n WHERE n.createdAt < :cutoffDate")
    long countOlderThan(LocalDateTime cutoffDate);
}
