package DoAn.BE.notification.service;

import DoAn.BE.notification.entity.Notification;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// Service quản lý thông báo xác thực và bảo mật (Auth & Security)
@Service
@Transactional
@RequiredArgsConstructor
public class AuthNotificationService {

    private final NotificationService notificationService;
    
    // ==================== AUTH & SECURITY NOTIFICATIONS ====================
    
    /**
     * Tạo notification đăng nhập thành công
     */
    public Notification createLoginSuccessNotification(Long userId, String ipAddress, String userAgent) {
        String title = "Đăng nhập thành công";
        String deviceInfo = userAgent != null && userAgent.length() > 50 ? 
            userAgent.substring(0, 47) + "..." : userAgent;
        String content = "Đăng nhập thành công từ IP: " + ipAddress + 
                        (deviceInfo != null ? " - " + deviceInfo : "");
        String link = "/profile/security";
        return notificationService.createNotification(userId, "AUTH_LOGIN_SUCCESS", title, content, link);
    }
    
    /**
     * Tạo notification bảo mật/cảnh báo
     */
    public Notification createSecurityAlertNotification(Long userId, String alertTitle, String alertContent) {
        String link = "/profile/security";
        return notificationService.createNotification(userId, "AUTH_SECURITY_ALERT", alertTitle, alertContent, link);
    }
    
    /**
     * Tạo notification thông tin chung
     */
    public Notification createInfoNotification(Long userId, String title, String content) {
        return notificationService.createNotification(userId, "INFO", title, content, null);
    }
    
    /**
     * Tạo notification khi login thành công từ IP/device mới
     */
    public Notification createNewLoginNotification(Long userId, String ipAddress, String userAgent) {
        String title = "Đăng nhập mới";
        String content = "Tài khoản của bạn vừa được đăng nhập từ IP: " + ipAddress;
        String link = "/profile/security";
        return notificationService.createNotification(userId, "AUTH_NEW_LOGIN", title, content, link);
    }
    
    /**
     * Tạo notification khi account bị khóa do brute force
     */
    public Notification createAccountLockedNotification(Long userId, int minutes) {
        String title = "Tài khoản tạm thời bị khóa";
        String content = "Tài khoản của bạn đã bị khóa " + minutes + " phút do đăng nhập sai quá nhiều lần";
        String link = "/profile/security";
        return notificationService.createNotification(userId, "AUTH_ACCOUNT_LOCKED", title, content, link);
    }
    
    /**
     * Tạo notification khi đổi mật khẩu thành công
     */
    public Notification createPasswordChangedNotification(Long userId) {
        String title = "Mật khẩu đã được thay đổi";
        String content = "Mật khẩu của bạn vừa được thay đổi thành công. Nếu không phải bạn, vui lòng liên hệ admin ngay";
        String link = "/profile/security";
        return notificationService.createNotification(userId, "AUTH_PASSWORD_CHANGED", title, content, link);
    }
    
    /**
     * Tạo notification welcome cho user mới
     */
    public Notification createWelcomeNotification(Long userId, String username) {
        String title = "Chào mừng đến với hệ thống";
        String content = "Xin chào " + username + "! Tài khoản của bạn đã được tạo thành công. Hãy bắt đầu khám phá hệ thống";
        String link = "/dashboard";
        return notificationService.createNotification(userId, "USER_WELCOME", title, content, link);
    }
    
    /**
     * Tạo notification khi account được kích hoạt
     */
    public Notification createAccountActivatedNotification(Long userId) {
        String title = "Tài khoản đã được kích hoạt";
        String content = "Tài khoản của bạn đã được kích hoạt. Bạn có thể đăng nhập và sử dụng hệ thống";
        String link = "/login";
        return notificationService.createNotification(userId, "USER_ACTIVATED", title, content, link);
    }
    
    /**
     * Tạo notification khi account bị vô hiệu hóa
     */
    public Notification createAccountDeactivatedNotification(Long userId, String reason) {
        String title = "Tài khoản đã bị vô hiệu hóa";
        String content = "Tài khoản của bạn đã bị vô hiệu hóa" + (reason != null ? ". Lý do: " + reason : "");
        String link = "/profile";
        return notificationService.createNotification(userId, "USER_DEACTIVATED", title, content, link);
    }
}
