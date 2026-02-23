package DoAn.BE.notification.service;

import DoAn.BE.notification.entity.Notification;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// [Service thông báo xác thực và bảo mật] (Role: System)
@Service
@Transactional
@RequiredArgsConstructor
public class AuthNotificationService {

    private final NotificationService notificationService;

    // ==================== AUTH NOTIFICATIONS ====================

    // [Thông báo đăng nhập thành công] (Role: System)
    public Notification createLoginSuccessNotification(Long userId, String ipAddress, String userAgent) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.AUTH_LOGIN_NEW_DEVICE,
                "/profile/security", ipAddress);
    }

    // [Thông báo cảnh báo bảo mật] (Role: System)
    public Notification createSecurityAlertNotification(Long userId, String alertTitle, String alertContent) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.AUTH_LOGIN_NEW_DEVICE,
                "/profile/security", alertContent);
    }

    // [Thông báo thông tin chung] (Role: System)
    public Notification createInfoNotification(Long userId, String title, String content) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.SYSTEM_ALERT,
                null, title, content);
    }

    // [Thông báo đăng nhập từ thiết bị mới] (Role: System)
    public Notification createNewLoginNotification(Long userId, String ipAddress, String userAgent) {
        String time = java.time.LocalDateTime.now()
                .format(java.time.format.DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy"));
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.AUTH_LOGIN_NEW_DEVICE,
                "/profile/security", "lúc " + time);
    }

    // ==================== SECURITY NOTIFICATIONS ====================

    // [Thông báo tài khoản bị khóa] (Role: System)
    public Notification createAccountLockedNotification(Long userId, int minutes) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.AUTH_LOGIN_NEW_DEVICE,
                "/profile/security", String.valueOf(minutes));
    }

    // [Thông báo đổi mật khẩu thành công] (Role: System)
    public Notification createPasswordChangedNotification(Long userId) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.AUTH_PASSWORD_CHANGED,
                "/profile/security");
    }

    // ==================== USER NOTIFICATIONS ====================

    // [Thông báo chào mừng user mới] (Role: System)
    public Notification createWelcomeNotification(Long userId, String username) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.SYSTEM_ALERT,
                "/dashboard", username);
    }

    // [Thông báo tài khoản được kích hoạt] (Role: System)
    public Notification createAccountActivatedNotification(Long userId) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.SYSTEM_ALERT,
                "/login");
    }

    // [Thông báo tài khoản bị vô hiệu hóa] (Role: System)
    public Notification createAccountDeactivatedNotification(Long userId, String reason) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.SYSTEM_ALERT,
                "/profile", reason != null ? reason : "Không có lý do");
    }

    // [Thông báo yêu cầu reset mật khẩu] (Role: System)
    public Notification sendPasswordResetNotification(Long userId, String resetInfo) {
        return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.AUTH_PASSWORD_CHANGED,
                "/auth/reset-password", resetInfo);
    }
}
