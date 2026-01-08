package DoAn.BE.chat.service;

import DoAn.BE.chat.websocket.service.WebSocketNotificationService;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

// [Service quản lý typing indicator trong chat] (Role: System)
@Service
public class TypingIndicatorService {

    private final WebSocketNotificationService webSocketNotificationService;
    private final UserRepository userRepository;

    public TypingIndicatorService(WebSocketNotificationService webSocketNotificationService,
            UserRepository userRepository) {
        this.webSocketNotificationService = webSocketNotificationService;
        this.userRepository = userRepository;
    }

    private final Map<Long, Set<Long>> typingUsers = new ConcurrentHashMap<>(); // roomId -> userIds
    private final Map<Long, Map<Long, Long>> lastTypingTime = new ConcurrentHashMap<>(); // roomId -> userId ->
                                                                                         // timestamp

    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

    @PostConstruct
    public void init() {
        scheduler.scheduleAtFixedRate(this::cleanupExpiredTyping, 5, 5, TimeUnit.SECONDS);
    }

    // Bắt đầu typing indicator
    public void startTyping(@NonNull Long roomId, @NonNull Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null)
            return;

        typingUsers.computeIfAbsent(roomId, (@NonNull Long k) -> ConcurrentHashMap.newKeySet()).add(userId);
        lastTypingTime.computeIfAbsent(roomId, (@NonNull Long k) -> new ConcurrentHashMap<>())
                .put(userId, System.currentTimeMillis());
        webSocketNotificationService.notifyTyping(roomId, userId, user.getUsername(), true);
    }

    // Dừng typing indicator
    public void stopTyping(@NonNull Long roomId, @NonNull Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null)
            return;

        Set<Long> roomTypingUsers = typingUsers.get(roomId);
        if (roomTypingUsers != null) {
            roomTypingUsers.remove(userId);
            if (roomTypingUsers.isEmpty()) {
                typingUsers.remove(roomId);
            }
        }

        Map<Long, Long> roomLastTyping = lastTypingTime.get(roomId);
        if (roomLastTyping != null) {
            roomLastTyping.remove(userId);
            if (roomLastTyping.isEmpty()) {
                lastTypingTime.remove(roomId);
            }
        }

        webSocketNotificationService.notifyTyping(roomId, userId, user.getUsername(), false);
    }

    // Lấy danh sách user đang typing (for UI: "A, B đang nhập...")
    public List<String> getTypingUsers(@NonNull Long roomId) {
        Set<Long> roomTypingUsers = typingUsers.get(roomId);
        if (roomTypingUsers == null || roomTypingUsers.isEmpty()) {
            return List.of();
        }

        return roomTypingUsers.stream()
                .map(userId -> userRepository.findById(userId)
                        .map(User::getUsername)
                        .orElse("Unknown"))
                .toList();
    }

    // Dọn dẹp typing indicator đã hết hạn (quá 5 giây)
    private void cleanupExpiredTyping() {
        long currentTime = System.currentTimeMillis();
        long expireTime = 5000; // 5 seconds

        for (Map.Entry<Long, Map<Long, Long>> roomEntry : lastTypingTime.entrySet()) {
            Long roomId = roomEntry.getKey();
            Map<Long, Long> roomLastTyping = roomEntry.getValue();

            List<Long> expiredUsers = roomLastTyping.entrySet().stream()
                    .filter(entry -> currentTime - entry.getValue() > expireTime)
                    .map(Map.Entry::getKey)
                    .toList();

            for (Long userId : expiredUsers) {
                stopTyping(roomId, userId);
            }
        }
    }
}
