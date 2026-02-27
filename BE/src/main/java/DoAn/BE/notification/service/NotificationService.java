package DoAn.BE.notification.service;

import DoAn.BE.notification.entity.Notification;
import DoAn.BE.notification.repository.NotificationRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import DoAn.BE.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
// Domain-specific notifications đã được tách ra:
// - AuthNotificationService: Auth & Security
// - ChatNotificationService: Chat
// - HRNotificationService: HR
// - ProjectNotificationService: Project
// - StorageNotificationService: Storage
@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;
    public Notification send(Long userId, DoAn.BE.notification.entity.NotificationType type, String link,
            Object... args) {
        if (userId == null) {
            throw new IllegalArgumentException("User ID không được null");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));

        NotificationTemplate template = NotificationTemplate.fromType(type);
        String title = template.getTitlePattern();
        String content = template.formatContent(args);

        Notification notification = new Notification();
        notification.setUser(user);
        notification.setType(type.name());
        notification.setTitle(title);
        notification.setContent(content);
        notification.setLink(link);
        // Default priority based on type could be added here

        Notification saved = notificationRepository.save(notification);
        eventPublisher.publishEvent(new DoAn.BE.common.event.NotificationCreatedEvent(this, saved));

        log.debug("Đã gửi thông báo {} cho user {}", type, userId);
        return saved;
    }
    public Page<Notification> getUserNotifications(Long userId, Pageable pageable) {
        if (userId == null) {
            throw new IllegalArgumentException("User ID không được null");
        }
        return notificationRepository.findByUser_UserIdOrderByCreatedAtDesc(userId, pageable);
    }
    public long getUnreadCount(Long userId) {
        if (userId == null) {
            return 0L;
        }
        return notificationRepository.countByUser_UserIdAndIsReadFalse(userId);
    }
    public void markAsRead(Long notificationId, Long userId) {
        if (notificationId == null || userId == null) {
            return;
        }

        notificationRepository.findById(notificationId).ifPresent(notification -> {
            if (notification.getUser() != null && notification.getUser().getUserId().equals(userId)) {
                notification.markAsRead();
                notificationRepository.save(notification);
                eventPublisher.publishEvent(
                        new DoAn.BE.common.event.NotificationReadEvent(this, userId, notificationId));
            }
        });
    }
    public void markAllAsRead(Long userId) {
        if (userId == null) {
            return;
        }

        List<Notification> unreadNotifications = notificationRepository
                .findByUser_UserIdOrderByCreatedAtDesc(userId)
                .stream()
                .filter(Notification::isUnread)
                .toList();

        for (Notification notification : unreadNotifications) {
            notification.markAsRead();
        }
        notificationRepository.saveAll(unreadNotifications);

        log.info("Đã đánh dấu {} thông báo đã đọc cho user {}", unreadNotifications.size(), userId);
    }
    public void deleteNotification(Long notificationId, Long userId) {
        if (notificationId == null || userId == null) {
            return;
        }

        notificationRepository.findById(notificationId).ifPresent(notification -> {
            if (notification.getUser() != null && notification.getUser().getUserId().equals(userId)) {
                notificationRepository.delete(notification);
            }
        });
    }
}
