package DoAn.BE.notification.controller;

import DoAn.BE.notification.dto.NotificationResponse;
import DoAn.BE.notification.entity.Notification;
import DoAn.BE.notification.service.NotificationService;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    @GetMapping
    public ResponseEntity<Page<NotificationResponse>> getMyNotifications(
            Pageable pageable,
            @AuthenticationPrincipal User currentUser) {
        Page<Notification> notifications = notificationService
                .getUserNotifications(currentUser.getUserId(), pageable);

        Page<NotificationResponse> response = notifications.map(n -> new NotificationResponse(
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
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@AuthenticationPrincipal User currentUser) {
        long unreadCount = notificationService.getUnreadCount(currentUser.getUserId());

        Map<String, Long> response = new HashMap<>();
        response.put("unreadCount", unreadCount);
        return ResponseEntity.ok(response);
    }
    @PutMapping("/{notificationId}/read")
    public ResponseEntity<Map<String, String>> markAsRead(
            @PathVariable Long notificationId,
            @AuthenticationPrincipal User currentUser) {
        notificationService.markAsRead(notificationId, currentUser.getUserId());

        Map<String, String> response = new HashMap<>();
        response.put("message", "Đã đánh dấu thông báo đã đọc");
        return ResponseEntity.ok(response);
    }
    @PutMapping("/mark-all-read")
    public ResponseEntity<Map<String, String>> markAllAsRead(@AuthenticationPrincipal User currentUser) {
        notificationService.markAllAsRead(currentUser.getUserId());

        Map<String, String> response = new HashMap<>();
        response.put("message", "Đã đánh dấu tất cả thông báo đã đọc");
        return ResponseEntity.ok(response);
    }
    @DeleteMapping("/{notificationId}")
    public ResponseEntity<Map<String, String>> deleteNotification(
            @PathVariable Long notificationId,
            @AuthenticationPrincipal User currentUser) {
        notificationService.deleteNotification(notificationId, currentUser.getUserId());

        Map<String, String> response = new HashMap<>();
        response.put("message", "Đã xóa thông báo");
        return ResponseEntity.ok(response);
    }
}
