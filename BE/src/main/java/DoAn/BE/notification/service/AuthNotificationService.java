package DoAn.BE.notification.service;

import DoAn.BE.notification.entity.Notification;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
@Transactional
@RequiredArgsConstructor
public class AuthNotificationService {

    private final NotificationService notificationService;
    public Notification createLoginSuccessNotification(Long userId, String ipAddress, String userAgent) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.AUTH_LOGIN_NEW_DEVICE,
                "/profile/security", ipAddress);
    }
    public Notification createSecurityAlertNotification(Long userId, String alertTitle, String alertContent) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.AUTH_LOGIN_NEW_DEVICE,
                "/profile/security", alertContent);
    }
    public Notification createInfoNotification(Long userId, String title, String content) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.SYSTEM_ALERT,
                null, title, content);
    }
    public Notification createNewLoginNotification(Long userId, String ipAddress, String userAgent) {
        String time = java.time.LocalDateTime.now()
                .format(java.time.format.DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy"));
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.AUTH_LOGIN_NEW_DEVICE,
                "/profile/security", "lúc " + time);
    }
    public Notification createAccountLockedNotification(Long userId, int minutes) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.AUTH_LOGIN_NEW_DEVICE,
                "/profile/security", String.valueOf(minutes));
    }
    public Notification createPasswordChangedNotification(Long userId) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.AUTH_PASSWORD_CHANGED,
                "/profile/security");
    }
    public Notification createWelcomeNotification(Long userId, String username) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.SYSTEM_ALERT,
                "/dashboard", username);
    }
    public Notification createAccountActivatedNotification(Long userId) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.SYSTEM_ALERT,
                "/login");
    }
    public Notification createAccountDeactivatedNotification(Long userId, String reason) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.SYSTEM_ALERT,
                "/profile", reason != null ? reason : "Không có lý do");
    }
    public Notification sendPasswordResetNotification(Long userId, String resetInfo) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.AUTH_PASSWORD_CHANGED,
                "/auth/reset-password", resetInfo);
    }
}
