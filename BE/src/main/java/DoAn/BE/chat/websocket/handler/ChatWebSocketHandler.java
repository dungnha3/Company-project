package DoAn.BE.chat.websocket.handler;

import DoAn.BE.chat.repository.ChatRoomMemberRepository;
import DoAn.BE.chat.service.MessageService;
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

@Controller
@Slf4j
public class ChatWebSocketHandler {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatRoomMemberRepository chatRoomMemberRepository;
    private final UserRepository userRepository;
    private final UserPresenceService userPresenceService;
    private final MessageService messageService;

    public ChatWebSocketHandler(SimpMessagingTemplate messagingTemplate,
            ChatRoomMemberRepository chatRoomMemberRepository,
            UserRepository userRepository,
            UserPresenceService userPresenceService,
            MessageService messageService) {
        this.messagingTemplate = messagingTemplate;
        this.chatRoomMemberRepository = chatRoomMemberRepository;
        this.userRepository = userRepository;
        this.userPresenceService = userPresenceService;
        this.messageService = messageService;
    }

    // Store typing users for each room
    private final Map<Long, Map<Long, Long>> typingUsers = new ConcurrentHashMap<>();

    // Handle incoming chat messages
    @MessageMapping("/chat.sendMessage")
    public void sendMessage(@Payload WebSocketMessage message, SimpMessageHeaderAccessor headerAccessor) {
        try {
            Object principal = headerAccessor.getUser();
            if (principal == null) {
                log.warn("WebSocket sendMessage: No principal found");
                return; // User not authenticated
            }

            // Extract User from Authentication wrapper
            // AuthChannelInterceptor sets principal as UsernamePasswordAuthenticationToken
            // with username (String) as the principal, NOT a User entity
            User user = null;
            if (principal instanceof org.springframework.security.authentication.UsernamePasswordAuthenticationToken authToken) {
                Object tokenPrincipal = authToken.getPrincipal();
                if (tokenPrincipal instanceof User u) {
                    user = u;
                } else if (tokenPrincipal instanceof String username) {
                    // AuthChannelInterceptor sets username as String principal
                    user = userRepository.findByUsername(username).orElse(null);
                }
            } else if (principal instanceof User u) {
                user = u;
            } else if (principal instanceof java.security.Principal p) {
                // Fallback: get name from principal
                String username = p.getName();
                user = userRepository.findByUsername(username).orElse(null);
            }

            if (user == null) {
                log.warn("WebSocket sendMessage: Could not resolve user from principal: {}",
                        principal.getClass().getName());
                return;
            }

            Long roomId = message.getRoomId();
            if (roomId == null || user.getUserId() == null) {
                log.warn("WebSocket sendMessage: Invalid roomId or userId");
                return; // Invalid data
            }

            // Check if user is member of the room
            boolean isMember = chatRoomMemberRepository.existsByChatRoom_RoomIdAndUser_UserId(roomId, user.getUserId());
            if (!isMember) {
                log.warn("WebSocket sendMessage: User {} not member of room {}", user.getUserId(), roomId);
                return; // User not authorized
            }

            // Delegate to MessageService for persistence + WebSocket broadcast
            // This ensures the message is saved to DB before being sent via WS
            DoAn.BE.chat.dto.SendMessageRequest sendReq = new DoAn.BE.chat.dto.SendMessageRequest();
            sendReq.setContent(message.getContent());
            sendReq.setRoomId(roomId);
            messageService.sendMessage(sendReq, user.getUserId());

        } catch (Exception e) {
            log.error("Lỗi khi gửi tin nhắn qua WebSocket: {}", e.getMessage(), e);
        }
    }

    @MessageMapping("/chat.typing.start")
    public void handleTypingStart(@Payload WebSocketMessage message, SimpMessageHeaderAccessor headerAccessor) {
        try {
            Object principal = headerAccessor.getUser();
            User user = null;
            if (principal instanceof org.springframework.security.authentication.UsernamePasswordAuthenticationToken authToken) {
                Object tp = authToken.getPrincipal();
                if (tp instanceof User u)
                    user = u;
                else if (tp instanceof String uname)
                    user = userRepository.findByUsername(uname).orElse(null);
            } else if (principal instanceof User u) {
                user = u;
            } else if (principal instanceof java.security.Principal p) {
                user = userRepository.findByUsername(p.getName()).orElse(null);
            }
            if (user == null)
                return;
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

    @MessageMapping("/chat.typing.stop")
    public void handleTypingStop(@Payload WebSocketMessage message, SimpMessageHeaderAccessor headerAccessor) {
        try {
            Object principal = headerAccessor.getUser();
            User user = null;
            if (principal instanceof org.springframework.security.authentication.UsernamePasswordAuthenticationToken authToken) {
                Object tp = authToken.getPrincipal();
                if (tp instanceof User u)
                    user = u;
                else if (tp instanceof String uname)
                    user = userRepository.findByUsername(uname).orElse(null);
            } else if (principal instanceof User u) {
                user = u;
            } else if (principal instanceof java.security.Principal p) {
                user = userRepository.findByUsername(p.getName()).orElse(null);
            }
            if (user == null)
                return;
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

    @MessageMapping("/chat.join")
    public void handleUserJoin(@Payload WebSocketMessage message, SimpMessageHeaderAccessor headerAccessor) {
        try {
            Object principal = headerAccessor.getUser();
            if (principal == null)
                return;
            User user = null;
            if (principal instanceof org.springframework.security.authentication.UsernamePasswordAuthenticationToken authToken) {
                Object tp = authToken.getPrincipal();
                if (tp instanceof User u)
                    user = u;
                else if (tp instanceof String uname)
                    user = userRepository.findByUsername(uname).orElse(null);
            } else if (principal instanceof User u) {
                user = u;
            } else if (principal instanceof java.security.Principal p) {
                user = userRepository.findByUsername(p.getName()).orElse(null);
            }
            if (user == null)
                return;
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
            log.error("Lỗi khi xử lý user join: {}", e.getMessage(), e);
        }
    }

    @MessageMapping("/chat.leave")
    public void handleUserLeave(@Payload WebSocketMessage message, SimpMessageHeaderAccessor headerAccessor) {
        try {
            Object principal = headerAccessor.getUser();
            if (principal == null)
                return;
            User user = null;
            if (principal instanceof org.springframework.security.authentication.UsernamePasswordAuthenticationToken authToken) {
                Object tp = authToken.getPrincipal();
                if (tp instanceof User u)
                    user = u;
                else if (tp instanceof String uname)
                    user = userRepository.findByUsername(uname).orElse(null);
            } else if (principal instanceof User u) {
                user = u;
            } else if (principal instanceof java.security.Principal p) {
                user = userRepository.findByUsername(p.getName()).orElse(null);
            }
            if (user == null)
                return;
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
            log.error("Lỗi khi xử lý user leave: {}", e.getMessage(), e);
        }
    }

    @MessageMapping("/chat.signal")
    public void handleSignal(@Payload WebSocketMessage message, SimpMessageHeaderAccessor headerAccessor) {
        try {
            Object principal = headerAccessor.getUser();
            if (principal == null)
                return;
            User user = null;
            if (principal instanceof org.springframework.security.authentication.UsernamePasswordAuthenticationToken authToken) {
                Object tp = authToken.getPrincipal();
                if (tp instanceof User u)
                    user = u;
                else if (tp instanceof String uname)
                    user = userRepository.findByUsername(uname).orElse(null);
            } else if (principal instanceof User u) {
                user = u;
            } else if (principal instanceof java.security.Principal p) {
                user = userRepository.findByUsername(p.getName()).orElse(null);
            }
            if (user == null)
                return;
            Long roomId = message.getRoomId();
            if (roomId == null)
                return;
            boolean isMember = chatRoomMemberRepository.existsByChatRoom_RoomIdAndUser_UserId(roomId, user.getUserId());
            if (!isMember) {
                log.warn("User {} tried to signal in room {} without membership", user.getUserId(), roomId);
                return;
            }

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

    // disconnected users
    @org.springframework.scheduling.annotation.Scheduled(fixedRate = 10000)
    public void cleanupStaleTypingEntries() {
        long currentTime = System.currentTimeMillis();
        typingUsers.forEach((roomId, roomMap) -> {
            roomMap.entrySet().removeIf(entry -> currentTime - entry.getValue() > 10000);
            if (roomMap.isEmpty()) {
                typingUsers.remove(roomId);
            }
        });
    }
}
