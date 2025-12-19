package DoAn.BE.chat.websocket.handler;

import DoAn.BE.chat.service.UserPresenceService;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

/**
 * Listener xử lý WebSocket connect/disconnect events
 * Tự động đánh dấu user online/offline khi kết nối/ngắt kết nối WebSocket
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketEventListener {

    private final UserPresenceService userPresenceService;

    /**
     * Xử lý khi user kết nối WebSocket
     */
    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        try {
            StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
            Object principal = headerAccessor.getUser();

            if (principal instanceof User) {
                User user = (User) principal;
                userPresenceService.markUserOnline(user.getUserId());
                log.info("User {} connected via WebSocket", user.getUsername());
            }
        } catch (Exception e) {
            log.error("Error handling WebSocket connect event: {}", e.getMessage());
        }
    }

    /**
     * Xử lý khi user ngắt kết nối WebSocket
     */
    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        try {
            StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
            Object principal = headerAccessor.getUser();

            if (principal instanceof User) {
                User user = (User) principal;
                userPresenceService.markUserOffline(user.getUserId());
                log.info("User {} disconnected from WebSocket", user.getUsername());
            }
        } catch (Exception e) {
            log.error("Error handling WebSocket disconnect event: {}", e.getMessage());
        }
    }
}
