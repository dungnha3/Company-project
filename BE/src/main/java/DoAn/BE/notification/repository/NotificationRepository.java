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

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUser_UserIdOrderByCreatedAtDesc(Long userId);

    Page<Notification> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);

    Page<Notification> findByUser_UserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    long countByUser_UserIdAndIsReadFalse(Long userId);

    @Modifying
    @Query("DELETE FROM Notification n WHERE n.createdAt < :cutoffDate")
    int deleteOlderThan(LocalDateTime cutoffDate);

    @Query("SELECT COUNT(n) FROM Notification n WHERE n.createdAt < :cutoffDate")
    long countOlderThan(LocalDateTime cutoffDate);

    List<Notification> findByUser_UserIdAndTypeOrderByCreatedAtDesc(Long userId, String type);

    List<Notification> findByUser_UserIdAndPriorityOrderByCreatedAtDesc(Long userId,
            DoAn.BE.notification.entity.NotificationPriority priority);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.user.userId = :userId AND n.isRead = false")
    int markAllAsReadByUserId(Long userId);
}
