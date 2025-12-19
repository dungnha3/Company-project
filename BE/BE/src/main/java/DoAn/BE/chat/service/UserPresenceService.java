package DoAn.BE.chat.service;

import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import DoAn.BE.chat.websocket.service.WebSocketNotificationService;
import DoAn.BE.chat.entity.ChatRoomMember;
import DoAn.BE.chat.repository.ChatRoomMemberRepository;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Transactional
public class UserPresenceService {

    private final UserRepository userRepository;
    private final WebSocketNotificationService webSocketNotificationService;
    private final ChatRoomMemberRepository chatRoomMemberRepository;

    public UserPresenceService(UserRepository userRepository,
            WebSocketNotificationService webSocketNotificationService,
            ChatRoomMemberRepository chatRoomMemberRepository) {
        this.userRepository = userRepository;
        this.webSocketNotificationService = webSocketNotificationService;
        this.chatRoomMemberRepository = chatRoomMemberRepository;
    }

    @jakarta.annotation.PostConstruct
    public void init() {
        resetAllUsersStatus();
    }

    private void resetAllUsersStatus() {
        List<User> onlineUsers = userRepository.findByIsOnlineTrue();
        for (User user : onlineUsers) {
            user.setIsOnline(false);
            userRepository.save(user);
        }
    }

    private final Set<Long> onlineUsers = ConcurrentHashMap.newKeySet(); // Lưu danh sách user đang online

    // Đánh dấu user online
    public void markUserOnline(@NonNull Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User không tồn tại"));

        boolean wasOffline = !onlineUsers.contains(userId);
        onlineUsers.add(userId);

        user.setIsOnline(true);
        user.setLastSeen(LocalDateTime.now());
        userRepository.save(user);

        if (wasOffline) {
            notifyUserStatusChange(userId, true);
        }
    }

    // Đánh dấu user offline
    public void markUserOffline(@NonNull Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User không tồn tại"));

        boolean wasOnline = onlineUsers.contains(userId);
        onlineUsers.remove(userId);

        user.setIsOnline(false);
        user.setLastSeen(LocalDateTime.now());
        userRepository.save(user);

        if (wasOnline) {
            notifyUserStatusChange(userId, false);
        }
    }

    // Kiểm tra user có online không
    public boolean isUserOnline(@NonNull Long userId) {
        return onlineUsers.contains(userId);
    }

    // Lấy danh sách user online
    public List<Long> getOnlineUsers() {
        return List.copyOf(onlineUsers);
    }

    // Lấy số lượng user online
    public int getOnlineUserCount() {
        return onlineUsers.size();
    }

    // Cập nhật last seen của user
    public void updateLastSeen(@NonNull Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User không tồn tại"));

        user.setLastSeen(LocalDateTime.now());
        userRepository.save(user);
    }

    // Thông báo thay đổi trạng thái online/offline
    private void notifyUserStatusChange(@NonNull Long userId, boolean isOnline) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null)
            return;

        String statusMessage = isOnline ? "đã online" : "đã offline";

        List<ChatRoomMember> userRooms = chatRoomMemberRepository.findByUser_UserId(userId);

        for (ChatRoomMember roomMember : userRooms) {
            Long roomId = roomMember.getChatRoom().getRoomId();

            java.util.Map<String, Object> data = new java.util.HashMap<>();
            data.put("userId", userId);
            data.put("username", user.getUsername());
            data.put("isOnline", isOnline);
            data.put("roomId", roomId);

            webSocketNotificationService.sendNotificationToRoom(
                    roomId,
                    "USER_STATUS_CHANGE",
                    user.getUsername() + " " + statusMessage,
                    data);
        }
    }

    // Dọn dẹp các user không hoạt động
    public void cleanupInactiveUsers() {
        LocalDateTime cutoffTime = LocalDateTime.now().minusMinutes(5);

        List<User> inactiveUsers = userRepository.findByIsOnlineTrueAndLastSeenBefore(cutoffTime);

        for (User user : inactiveUsers) {
            markUserOffline(user.getUserId());
        }
    }
}
