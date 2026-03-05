package DoAn.BE.chat.service;

import DoAn.BE.chat.websocket.dto.WebSocketMessage;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

// [COMPLETE - Integrated with WebSocket]
// Features: Track voice users, WebSocket notifications, mute/video toggle, presence sync
@Service
@Transactional
@Slf4j
public class VoiceStateService {

    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    // In-memory real-time state tracking
    private final Map<Long, Set<Long>> activeVoiceUsers = new ConcurrentHashMap<>(); // roomId -> userIds
    private final Map<Long, Map<Long, VoiceState>> userVoiceStates = new ConcurrentHashMap<>(); // roomId -> userId ->
                                                                                                // state

    public VoiceStateService(SimpMessagingTemplate messagingTemplate,
            UserRepository userRepository) {
        this.messagingTemplate = messagingTemplate;
        this.userRepository = userRepository;
    }

    // User joins voice room
    public void joinVoiceRoom(Long roomId, Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            log.warn("User {} not found when joining voice room {}", userId, roomId);
            return;
        }

        // Add to in-memory tracking
        activeVoiceUsers.computeIfAbsent(roomId, k -> ConcurrentHashMap.newKeySet()).add(userId);
        userVoiceStates.computeIfAbsent(roomId, k -> new ConcurrentHashMap<>())
                .put(userId, new VoiceState(userId, user.getUsername(), false, true)); // muted=false, video=true

        // Update user presence status
        user.setPresenceStatus(User.PresenceStatus.IN_MEETING);
        userRepository.save(user);

        // Notify room members
        notifyVoiceStateChange(roomId, userId, user.getUsername(), "VOICE_JOINED");

        log.info("User {} joined voice room {}", user.getUsername(), roomId);
    }

    // User leaves voice room
    public void leaveVoiceRoom(Long roomId, Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        String username = user != null ? user.getUsername() : "Unknown";

        // Remove from in-memory tracking
        Set<Long> roomUsers = activeVoiceUsers.get(roomId);
        if (roomUsers != null) {
            roomUsers.remove(userId);
            if (roomUsers.isEmpty()) {
                activeVoiceUsers.remove(roomId);
            }
        }

        Map<Long, VoiceState> roomStates = userVoiceStates.get(roomId);
        if (roomStates != null) {
            roomStates.remove(userId);
            if (roomStates.isEmpty()) {
                userVoiceStates.remove(roomId);
            }
        }

        // Reset user presence if they were in a meeting
        if (user != null && user.getPresenceStatus() == User.PresenceStatus.IN_MEETING) {
            user.setPresenceStatus(User.PresenceStatus.ONLINE);
            userRepository.save(user);
        }

        // Notify room members
        notifyVoiceStateChange(roomId, userId, username, "VOICE_LEFT");

        log.info("User {} left voice room {}", username, roomId);
    }

    // Toggle mute state
    public void toggleMute(Long roomId, Long userId, boolean isMuted) {
        Map<Long, VoiceState> roomStates = userVoiceStates.get(roomId);
        if (roomStates != null && roomStates.containsKey(userId)) {
            VoiceState state = roomStates.get(userId);
            state.setMuted(isMuted);

            notifyVoiceStateChange(roomId, userId, state.getUsername(),
                    isMuted ? "VOICE_MUTED" : "VOICE_UNMUTED");
        }
    }

    // Toggle video state
    public void toggleVideo(Long roomId, Long userId, boolean videoOn) {
        Map<Long, VoiceState> roomStates = userVoiceStates.get(roomId);
        if (roomStates != null && roomStates.containsKey(userId)) {
            VoiceState state = roomStates.get(userId);
            state.setVideoOn(videoOn);

            notifyVoiceStateChange(roomId, userId, state.getUsername(),
                    videoOn ? "VIDEO_ON" : "VIDEO_OFF");
        }
    }

    // Get detailed voice states for a room (used internally for WebSocket
    // notification)
    public List<VoiceState> getVoiceStates(Long roomId) {
        Map<Long, VoiceState> states = userVoiceStates.get(roomId);
        if (states == null) {
            return List.of();
        }
        return new ArrayList<>(states.values());
    }

    private void notifyVoiceStateChange(Long roomId, Long userId, String username, String eventType) {
        Map<String, Object> data = new HashMap<>();
        data.put("roomId", roomId);
        data.put("userId", userId);
        data.put("username", username);
        data.put("eventType", eventType);
        data.put("timestamp", LocalDateTime.now().toString());

        // Include current voice states
        data.put("voiceUsers", getVoiceStates(roomId));

        WebSocketMessage wsMessage = new WebSocketMessage(
                WebSocketMessage.MessageType.NOTIFICATION,
                roomId,
                userId,
                username,
                eventType);
        wsMessage.setData(data);

        messagingTemplate.convertAndSend("/topic/room." + roomId + ".voice", wsMessage);
    }

    @lombok.Data
    @lombok.AllArgsConstructor
    public static class VoiceState {
        private Long userId;
        private String username;
        private boolean muted;
        private boolean videoOn;
    }
}
