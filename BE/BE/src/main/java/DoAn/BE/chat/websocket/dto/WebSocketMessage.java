package DoAn.BE.chat.websocket.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WebSocketMessage {

    public enum MessageType {
        CHAT_MESSAGE,
        TYPING_START,
        TYPING_STOP,
        USER_JOINED,
        USER_LEFT,
        MESSAGE_EDITED,
        MESSAGE_DELETED,
        ROOM_UPDATED,
        MESSAGE_SEEN,
        NOTIFICATION,
        CALL_OFFER,
        CALL_ANSWER,
        ICE_CANDIDATE,
        CALL_REJECT,
        CALL_END
    }

    private MessageType type;
    private Long roomId;
    private Long userId;
    private String username;
    private String content;
    private Long messageId;
    private String timestamp;
    private Object data; // For additional data like file info, etc.

    // Constructor for chat messages
    public WebSocketMessage(MessageType type, Long roomId, Long userId, String username, String content) {
        this.type = type;
        this.roomId = roomId;
        this.userId = userId;
        this.username = username;
        this.content = content;
        this.timestamp = java.time.LocalDateTime.now().toString();
    }

    // Constructor for typing indicators
    public WebSocketMessage(MessageType type, Long roomId, Long userId, String username) {
        this.type = type;
        this.roomId = roomId;
        this.userId = userId;
        this.username = username;
        this.timestamp = java.time.LocalDateTime.now().toString();
    }

    // Constructor for notifications
    public WebSocketMessage(MessageType type, String content, Object data) {
        this.type = type;
        this.content = content;
        this.data = data;
        this.timestamp = java.time.LocalDateTime.now().toString();
    }
}
