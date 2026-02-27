package DoAn.BE.chat.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
@Component
@Slf4j
@RequiredArgsConstructor
public class SignalingHandler extends TextWebSocketHandler {

    private final ObjectMapper objectMapper;

    // Map<RoomId, Map<UserId, Session>>
    private final Map<String, Map<String, WebSocketSession>> rooms = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        // Extract roomId and userId from query params or headers?
        // Let's assume URL: /ws/signal?roomId=123&userId=456
        String query = session.getUri().getQuery();
        Map<String, String> params = parseQuery(query);
        String roomId = params.get("roomId");
        String userId = params.get("userId");

        if (roomId != null && userId != null) {
            rooms.computeIfAbsent(roomId, k -> new ConcurrentHashMap<>()).put(userId, session);
            log.info("User {} joined Voice Room {}", userId, roomId);
        } else {
            session.close(CloseStatus.BAD_DATA);
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        // Message format: { "type": "offer|answer|candidate", "targetUserId": "...",
        // "payload": ... }
        String payload = message.getPayload();
        @SuppressWarnings("unchecked")
        Map<String, Object> data = objectMapper.readValue(payload, Map.class);

        String type = (String) data.get("type");
        String targetUserId = String.valueOf(data.get("targetUserId"));
        String roomId = (String) data.get("roomId"); // Or get from session

        Map<String, WebSocketSession> roomSessions = rooms.get(roomId);
        if (roomSessions == null)
            return;

        if ("join".equals(type)) {
            // Notify others
            return;
        }

        // Forward signaling message to target user
        WebSocketSession targetSession = roomSessions.get(targetUserId);
        if (targetSession != null && targetSession.isOpen()) {
            targetSession.sendMessage(message);
        } else {
            log.warn("Target user {} not found or offline in room {}", targetUserId, roomId);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String query = session.getUri().getQuery();
        Map<String, String> params = parseQuery(query);
        String roomId = params.get("roomId");
        String userId = params.get("userId");

        if (roomId != null && userId != null) {
            Map<String, WebSocketSession> room = rooms.get(roomId);
            if (room != null) {
                room.remove(userId);
                if (room.isEmpty()) {
                    rooms.remove(roomId);
                } else {
                    // Notify others that user left?
                    // Implement "user-left" message
                }
            }
            log.info("User {} left Voice Room {}", userId, roomId);
        }
    }

    private Map<String, String> parseQuery(String query) {
        Map<String, String> queryPairs = new java.util.HashMap<>();
        if (query == null)
            return queryPairs;
        String[] pairs = query.split("&");
        for (String pair : pairs) {
            int idx = pair.indexOf("=");
            if (idx > 0) {
                queryPairs.put(pair.substring(0, idx), pair.substring(idx + 1));
            }
        }
        return queryPairs;
    }
}
