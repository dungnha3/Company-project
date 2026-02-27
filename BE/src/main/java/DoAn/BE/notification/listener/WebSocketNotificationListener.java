package DoAn.BE.notification.listener;

import DoAn.BE.chat.websocket.service.WebSocketNotificationService;
import DoAn.BE.common.event.NotificationCreatedEvent;
import DoAn.BE.notification.dto.NotificationResponse;
import DoAn.BE.notification.entity.Notification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Listener lắng nghe NotificationCreatedEvent và đẩy thông báo
 * real-time đến user qua WebSocket (STOMP /user/queue/notifications).
 *
 * Flow: NotificationService.send() → publish event → listener → WebSocket push
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketNotificationListener {

    private final WebSocketNotificationService webSocketNotificationService;

    @Async("notificationExecutor")
    @EventListener
    public void handleNotificationCreated(NotificationCreatedEvent event) {
        Notification notification = event.getNotification();

        if (notification == null || notification.getUser() == null) {
            log.warn("Received NotificationCreatedEvent with null notification or user");
            return;
        }

        try {
            String username = notification.getUser().getUsername();
            String title = notification.getTitle();

            // Build response DTO to send as WebSocket data payload
            NotificationResponse response = new NotificationResponse(
                    notification.getNotificationId(),
                    notification.getType() != null ? notification.getType().toString() : null,
                    title,
                    notification.getContent(),
                    notification.getLink(),
                    notification.getIsRead(),
                    notification.getCreatedAt(),
                    notification.getUser().getUserId());

            // Push real-time via WebSocket to user's personal queue
            webSocketNotificationService.sendNotification(username, title, response);

            log.info("[WS-NOTIFY] Pushed real-time notification {} to user '{}'",
                    notification.getNotificationId(), username);
        } catch (Exception e) {
            // Non-critical: log and continue, don't break the notification flow
            log.error("[WS-NOTIFY] Failed to push WebSocket notification {}: {}",
                    notification.getNotificationId(), e.getMessage(), e);
        }
    }
}
