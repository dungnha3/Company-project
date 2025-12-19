package DoAn.BE.chat.websocket.handler;

import DoAn.BE.chat.dto.MessDTO;
import DoAn.BE.chat.repository.ChatRoomMemberRepository;
import DoAn.BE.chat.websocket.dto.WebSocketMessage;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import DoAn.BE.chat.service.UserPresenceService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

// WebSocket handler xử lý real-time chat messages, typing indicators, user presence
@Controller
@Slf4j
public class ChatWebSocketHandler {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatRoomMemberRepository chatRoomMemberRepository;
    private final UserRepository userRepository;
    private final UserPresenceService userPresenceService;

    public ChatWebSocketHandler(SimpMessagingTemplate messagingTemplate,
            ChatRoomMemberRepository chatRoomMemberRepository,
            UserRepository userRepository,
            UserPresenceService userPresenceService) {
        this.messagingTemplate = messagingTemplate;
        this.chatRoomMemberRepository = chatRoomMemberRepository;
        this.userRepository = userRepository;
        this.userPresenceService = userPresenceService;
    }

    // Store typing users for each room
    private final Map<Long, Map<Long, Long>> typingUsers = new ConcurrentHashMap<>();

    // Handle incoming chat messages
    @MessageMapping("/chat.sendMessage")
    public void sendMessage(@Payload WebSocketMessage message, SimpMessageHeaderAccessor headerAccessor) {
        try {
            Object principal = headerAccessor.getUser();
            if (principal == null || !(principal instanceof User)) {
                return; // User not authenticated
            }

            User user = (User) principal;
            Long roomId = message.getRoomId();
            if (roomId == null || user.getUserId() == null) {
                return; // Invalid data
            }

            // Check if user is member of the room
            boolean isMember = chatRoomMemberRepository.existsByChatRoom_RoomIdAndUser_UserId(roomId, user.getUserId());
            if (!isMember) {
                return; // User not authorized
            }

            // Create message DTO
            MessDTO messageDTO = new MessDTO();
            messageDTO.setRoomId(roomId);
            messageDTO.setContent(message.getContent());
            // Convert User to UserDTO
            DoAn.BE.user.dto.UserDTO userDTO = new DoAn.BE.user.dto.UserDTO();
            userDTO.setUserId(user.getUserId());
            userDTO.setUsername(user.getUsername());
            userDTO.setEmail(user.getEmail());
            userDTO.setAvatarUrl(user.getAvatarUrl());
            messageDTO.setSender(userDTO);

            // Send message to all room members
            WebSocketMessage wsMessage = new WebSocketMessage(
                    WebSocketMessage.MessageType.CHAT_MESSAGE,
                    roomId,
                    user.getUserId(),
                    user.getUsername(),
                    message.getContent());
            wsMessage.setMessageId(System.currentTimeMillis()); // Temporary ID

            messagingTemplate.convertAndSend("/topic/room." + roomId, wsMessage);

        } catch (Exception e) {
            log.error("Lỗi khi gửi tin nhắn qua WebSocket: {}", e.getMessage(), e);
        }
    }

    /**
     * Handle typing start
     */
    @MessageMapping("/chat.typing.start")
    public void handleTypingStart(@Payload WebSocketMessage message, SimpMessageHeaderAccessor headerAccessor) {
        try {
            Object principal = headerAccessor.getUser();
            if (principal == null || !(principal instanceof User))
                return;

            User user = (User) principal;
            Long roomId = message.getRoomId();
            if (roomId == null || user.getUserId() == null) {
                return; // Invalid data
            }

            // Check if user is member of the room
            boolean isMember = chatRoomMemberRepository.existsByChatRoom_RoomIdAndUser_UserId(roomId, user.getUserId());
            if (!isMember)
                return;

            // Add user to typing list
            typingUsers.computeIfAbsent(roomId, k -> new ConcurrentHashMap<>())
                    .put(user.getUserId(), System.currentTimeMillis());

            // Notify other users
            WebSocketMessage wsMessage = new WebSocketMessage(
                    WebSocketMessage.MessageType.TYPING_START,
                    roomId,
                    user.getUserId(),
                    user.getUsername());

            messagingTemplate.convertAndSend("/topic/room." + roomId, wsMessage);

        } catch (Exception e) {
            log.error("Lỗi khi xử lý typing indicator: {}", e.getMessage(), e);
        }
    }

    /**
     * Handle typing stop
     */
    @MessageMapping("/chat.typing.stop")
    public void handleTypingStop(@Payload WebSocketMessage message, SimpMessageHeaderAccessor headerAccessor) {
        try {
            Object principal = headerAccessor.getUser();
            if (principal == null || !(principal instanceof User))
                return;

            User user = (User) principal;
            Long roomId = message.getRoomId();
            if (roomId == null || user.getUserId() == null) {
                return; // Invalid data
            }

            // Remove user from typing list
            Map<Long, Long> roomTypingUsers = typingUsers.get(roomId);
            if (roomTypingUsers != null) {
                roomTypingUsers.remove(user.getUserId());
                if (roomTypingUsers.isEmpty()) {
                    typingUsers.remove(roomId);
                }
            }

            // Notify other users
            WebSocketMessage wsMessage = new WebSocketMessage(
                    WebSocketMessage.MessageType.TYPING_STOP,
                    roomId,
                    user.getUserId(),
                    user.getUsername());

            messagingTemplate.convertAndSend("/topic/room." + roomId, wsMessage);

        } catch (Exception e) {
            log.error("Lỗi khi xử lý typing indicator: {}", e.getMessage(), e);
        }
    }

    /**
     * Handle user join room
     */
    @MessageMapping("/chat.join")
    public void handleUserJoin(@Payload WebSocketMessage message, SimpMessageHeaderAccessor headerAccessor) {
        try {
            Object principal = headerAccessor.getUser();
            if (principal == null || !(principal instanceof User))
                return;

            User user = (User) principal;
            Long roomId = message.getRoomId();
            if (roomId == null || user.getUserId() == null) {
                return; // Invalid data
            }

            // Check if user is member of the room
            boolean isMember = chatRoomMemberRepository.existsByChatRoom_RoomIdAndUser_UserId(roomId, user.getUserId());
            if (!isMember)
                return;

            // Mark user as online
            userPresenceService.markUserOnline(user.getUserId());

            // Notify other users
            WebSocketMessage wsMessage = new WebSocketMessage(
                    WebSocketMessage.MessageType.USER_JOINED,
                    roomId,
                    user.getUserId(),
                    user.getUsername());

            messagingTemplate.convertAndSend("/topic/room." + roomId, wsMessage);

        } catch (Exception e) {
            log.error("Lỗi khi xử lý typing indicator: {}", e.getMessage(), e);
        }
    }

    /**
     * Handle user leave room
     */
    @MessageMapping("/chat.leave")
    public void handleUserLeave(@Payload WebSocketMessage message, SimpMessageHeaderAccessor headerAccessor) {
        try {
            Object principal = headerAccessor.getUser();
            if (principal == null || !(principal instanceof User))
                return;

            User user = (User) principal;
            Long roomId = message.getRoomId();
            if (roomId == null || user.getUserId() == null) {
                return; // Invalid data
            }

            // Remove user from typing list
            Map<Long, Long> roomTypingUsers = typingUsers.get(roomId);
            if (roomTypingUsers != null) {
                roomTypingUsers.remove(user.getUserId());
                if (roomTypingUsers.isEmpty()) {
                    typingUsers.remove(roomId);
                }
            }

            // Mark user as offline
            userPresenceService.markUserOffline(user.getUserId());

            // Notify other users
            WebSocketMessage wsMessage = new WebSocketMessage(
                    WebSocketMessage.MessageType.USER_LEFT,
                    roomId,
                    user.getUserId(),
                    user.getUsername());

            messagingTemplate.convertAndSend("/topic/room." + roomId, wsMessage);

        } catch (Exception e) {
            log.error("Lỗi khi xử lý typing indicator: {}", e.getMessage(), e);
        }
    }

    /**
     * Handle WebRTC signaling
     */
    @MessageMapping("/chat.signal")
    public void handleSignal(@Payload WebSocketMessage message, SimpMessageHeaderAccessor headerAccessor) {
        try {
            Object principal = headerAccessor.getUser();
            if (principal == null || !(principal instanceof User))
                return;

            User user = (User) principal;
            Long roomId = message.getRoomId();
            if (roomId == null)
                return;

            // Re-broadcast signal to room
            WebSocketMessage signalMsg = new WebSocketMessage(
                    message.getType(),
                    roomId,
                    user.getUserId(),
                    user.getUsername());
            signalMsg.setData(message.getData());

            messagingTemplate.convertAndSend("/topic/room." + roomId, signalMsg);

        } catch (Exception e) {
            log.error("Lỗi khi xử lý video call signal: {}", e.getMessage(), e);
        }
    }

    /**
     * Get typing users for a room
     */
    public List<String> getTypingUsers(Long roomId) {
        if (roomId == null) {
            return List.of();
        }
        Map<Long, Long> roomTypingUsers = typingUsers.get(roomId);
        if (roomTypingUsers == null || roomTypingUsers.isEmpty()) {
            return List.of();
        }

        // Clean up old typing indicators (older than 5 seconds)
        long currentTime = System.currentTimeMillis();
        roomTypingUsers.entrySet().removeIf(entry -> currentTime - entry.getValue() > 5000);

        return roomTypingUsers.keySet().stream()
                .map(userId -> userRepository.findById(userId)
                        .map(User::getUsername)
                        .orElse("Unknown"))
                .toList();
    }
}
