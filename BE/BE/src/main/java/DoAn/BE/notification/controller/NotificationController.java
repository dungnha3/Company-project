package DoAn.BE.notification.controller;

import DoAn.BE.notification.dto.NotificationResponse;
import DoAn.BE.notification.entity.Notification;
import DoAn.BE.notification.service.NotificationService;
import DoAn.BE.common.exception.EntityNotFoundException;
import DoAn.BE.common.exception.UnauthorizedException;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "*")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private UserRepository userRepository;

    /**
     * Lấy thông tin user hiện tại từ Security Context
     */
    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UnauthorizedException("User chưa đăng nhập");
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof User) {
            return (User) principal;
        }

        // Fallback if principal is just a username string (should not happen with
        // JwtAuthenticationFilter)
        String username = authentication.getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new EntityNotFoundException("User không tồn tại: " + username));
    }

    /**
     * Lấy danh sách notification của user hiện tại
     * Trả về Page<NotificationResponse> (DTO)
     */
    @GetMapping
    public ResponseEntity<org.springframework.data.domain.Page<NotificationResponse>> getMyNotifications(
            org.springframework.data.domain.Pageable pageable) {
        User currentUser = getCurrentUser();
        org.springframework.data.domain.Page<Notification> notifications = notificationService
                .getUserNotifications(currentUser.getUserId(), pageable);

        // Map Entity -> DTO
        org.springframework.data.domain.Page<NotificationResponse> response = notifications
                .map(n -> new NotificationResponse(
                        n.getNotificationId(),
                        n.getType(),
                        n.getTitle(),
                        n.getContent(),
                        n.getLink(),
                        n.getIsRead(),
                        n.getCreatedAt(),
                        n.getUser().getUserId()));

        return ResponseEntity.ok(response);
    }

    /**
     * Lấy số notification chưa đọc
     */
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        User currentUser = getCurrentUser();
        long unreadCount = notificationService.getUnreadCount(currentUser.getUserId());

        Map<String, Long> response = new HashMap<>();
        response.put("unreadCount", unreadCount);
        return ResponseEntity.ok(response);
    }

    /**
     * Đánh dấu notification đã đọc
     */
    @PutMapping("/{notificationId}/read")
    public ResponseEntity<Map<String, String>> markAsRead(@PathVariable Long notificationId) {
        User currentUser = getCurrentUser();
        notificationService.markAsRead(notificationId, currentUser.getUserId());

        Map<String, String> response = new HashMap<>();
        response.put("message", "Notification đã được đánh dấu đã đọc");
        return ResponseEntity.ok(response);
    }

    /**
     * Đánh dấu tất cả notification đã đọc
     */
    @PutMapping("/mark-all-read")
    public ResponseEntity<Map<String, String>> markAllAsRead() {
        User currentUser = getCurrentUser();
        notificationService.markAllAsRead(currentUser.getUserId());

        Map<String, String> response = new HashMap<>();
        response.put("message", "Tất cả notification đã được đánh dấu đã đọc");
        return ResponseEntity.ok(response);
    }

    /**
     * Xóa notification
     */
    @DeleteMapping("/{notificationId}")
    public ResponseEntity<Map<String, String>> deleteNotification(@PathVariable Long notificationId) {
        User currentUser = getCurrentUser();
        notificationService.deleteNotification(notificationId, currentUser.getUserId());

        Map<String, String> response = new HashMap<>();
        response.put("message", "Notification đã được xóa");
        return ResponseEntity.ok(response);
    }
}
