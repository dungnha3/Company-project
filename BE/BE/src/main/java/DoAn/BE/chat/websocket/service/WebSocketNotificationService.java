package DoAn.BE.chat.websocket.service;

import DoAn.BE.chat.dto.MessDTO;
import DoAn.BE.chat.entity.ChatRoomMember;
import DoAn.BE.chat.repository.ChatRoomMemberRepository;
import DoAn.BE.chat.websocket.dto.WebSocketMessage;
import DoAn.BE.user.entity.User;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class WebSocketNotificationService {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatRoomMemberRepository chatRoomMemberRepository;

    public WebSocketNotificationService(SimpMessagingTemplate messagingTemplate,
            ChatRoomMemberRepository chatRoomMemberRepository) {
        this.messagingTemplate = messagingTemplate;
        this.chatRoomMemberRepository = chatRoomMemberRepository;
    }

    // Gửi thông báo tin nhắn mới
    public void notifyNewMessage(Long roomId, MessDTO message) {
        WebSocketMessage wsMessage = new WebSocketMessage(
                WebSocketMessage.MessageType.CHAT_MESSAGE,
                roomId,
                message.getSender().getUserId(),
                message.getSender().getUsername(),
                message.getContent());
        wsMessage.setMessageId(message.getMessageId());
        wsMessage.setTimestamp(message.getSentAt().toString());
        wsMessage.setData(message); // Set full message object for frontend

        messagingTemplate.convertAndSend("/topic/room." + roomId, wsMessage);
        List<ChatRoomMember> members = chatRoomMemberRepository.findByChatRoom_RoomId(roomId);
        for (ChatRoomMember member : members) {
            if (!member.getUser().getUserId().equals(message.getSender().getUserId())) {
                messagingTemplate.convertAndSendToUser(
                        member.getUser().getUsername(),
                        "/queue/notifications",
                        wsMessage);
            }
        }
    }

    // Thông báo tin nhắn đã được sửa
    public void notifyMessageEdited(Long roomId, MessDTO message) {
        WebSocketMessage wsMessage = new WebSocketMessage(
                WebSocketMessage.MessageType.MESSAGE_EDITED,
                roomId,
                message.getSender().getUserId(),
                message.getSender().getUsername(),
                message.getContent());
        wsMessage.setMessageId(message.getMessageId());

        messagingTemplate.convertAndSend("/topic/room." + roomId, wsMessage);
    }

    // Thông báo tin nhắn đã được xóa
    public void notifyMessageDeleted(Long roomId, Long messageId, Long userId) {
        WebSocketMessage wsMessage = new WebSocketMessage(
                WebSocketMessage.MessageType.MESSAGE_DELETED,
                roomId,
                userId,
                null,
                null);
        wsMessage.setMessageId(messageId);

        messagingTemplate.convertAndSend("/topic/room." + roomId, wsMessage);
    }

    // Thông báo thành viên mới tham gia
    public void notifyUserJoined(Long roomId, User user) {
        WebSocketMessage wsMessage = new WebSocketMessage(
                WebSocketMessage.MessageType.USER_JOINED,
                roomId,
                user.getUserId(),
                user.getUsername(),
                user.getUsername() + " đã tham gia phòng chat");

        messagingTemplate.convertAndSend("/topic/room." + roomId, wsMessage);
    }

    // Thông báo thành viên rời khỏi phòng
    public void notifyUserLeft(Long roomId, User user) {
        WebSocketMessage wsMessage = new WebSocketMessage(
                WebSocketMessage.MessageType.USER_LEFT,
                roomId,
                user.getUserId(),
                user.getUsername(),
                user.getUsername() + " đã rời khỏi phòng chat");

        messagingTemplate.convertAndSend("/topic/room." + roomId, wsMessage);
    }

    // Thông báo cập nhật thông tin phòng
    public void notifyRoomUpdated(Long roomId, String updateMessage) {
        WebSocketMessage wsMessage = new WebSocketMessage(
                WebSocketMessage.MessageType.ROOM_UPDATED,
                roomId,
                null,
                null,
                updateMessage);

        messagingTemplate.convertAndSend("/topic/room." + roomId, wsMessage);
    }

    // Gửi typing indicator
    public void notifyTyping(Long roomId, Long userId, String username, boolean isTyping) {
        WebSocketMessage.MessageType type = isTyping ? WebSocketMessage.MessageType.TYPING_START
                : WebSocketMessage.MessageType.TYPING_STOP;

        WebSocketMessage wsMessage = new WebSocketMessage(type, roomId, userId, username);

        messagingTemplate.convertAndSend("/topic/room." + roomId, wsMessage);
    }

    // Thông báo tin nhắn đã được đọc
    public void notifyMessageSeen(Long roomId, Long messageId, Long userId, String username, String avatarUrl) {
        WebSocketMessage wsMessage = new WebSocketMessage(
                WebSocketMessage.MessageType.MESSAGE_SEEN,
                roomId,
                userId,
                username);
        wsMessage.setMessageId(messageId);

        java.util.Map<String, Object> data = new java.util.HashMap<>();
        data.put("messageId", messageId);
        data.put("userId", userId);
        data.put("username", username);
        data.put("avatarUrl", avatarUrl);

        wsMessage.setData(data);

        messagingTemplate.convertAndSend("/topic/room." + roomId, wsMessage);
    }

    // Gửi notification chung
    public void sendNotification(String username, String message, Object data) {
        WebSocketMessage wsMessage = new WebSocketMessage(
                WebSocketMessage.MessageType.NOTIFICATION,
                message,
                data);

        messagingTemplate.convertAndSendToUser(username, "/queue/notifications", wsMessage);
    }

    // Gửi notification đến tất cả thành viên trong phòng
    public void sendNotificationToRoom(Long roomId, String type, String message, Object data) {
        WebSocketMessage wsMessage = new WebSocketMessage(
                WebSocketMessage.MessageType.NOTIFICATION,
                roomId,
                null,
                null,
                message);
        wsMessage.setData(data);

        messagingTemplate.convertAndSend("/topic/room." + roomId, wsMessage);
    }
}
