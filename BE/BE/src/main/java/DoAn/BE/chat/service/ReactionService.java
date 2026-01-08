package DoAn.BE.chat.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import DoAn.BE.chat.entity.Message;
import DoAn.BE.chat.entity.MessageReaction;
import DoAn.BE.chat.repository.MessageReactionRepository;
import DoAn.BE.chat.repository.MessageRepository;
import DoAn.BE.chat.websocket.service.WebSocketNotificationService;
import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.EntityNotFoundException;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// SRP: Service chỉ xử lý reaction logic (thêm/xóa/lấy reactions)
@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class ReactionService {

    private final MessageReactionRepository reactionRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final WebSocketNotificationService webSocketNotificationService;

    // Các emoji được phép sử dụng
    private static final List<String> ALLOWED_EMOJIS = List.of("👍", "❤️", "😂", "🎉", "😢", "😠", "👏", "🔥");

    // Thêm reaction vào tin nhắn
    public void addReaction(Long messageId, Long userId, String emoji) {
        // Validate emoji
        if (!ALLOWED_EMOJIS.contains(emoji)) {
            throw new BadRequestException("Emoji không được hỗ trợ: " + emoji);
        }

        // Kiểm tra message tồn tại
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new EntityNotFoundException("Tin nhắn không tồn tại"));

        // Kiểm tra user tồn tại
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("Người dùng không tồn tại"));

        // Kiểm tra đã react emoji này chưa
        if (reactionRepository.existsByMessage_MessageIdAndUser_UserIdAndEmoji(messageId, userId, emoji)) {
            throw new BadRequestException("Bạn đã react emoji này rồi");
        }

        // Tạo reaction
        MessageReaction reaction = MessageReaction.builder()
                .message(message)
                .user(user)
                .emoji(emoji)
                .build();

        reactionRepository.save(reaction);

        log.info("User {} added reaction {} to message {}", user.getUsername(), emoji, messageId);

        // Notify via WebSocket
        notifyReactionChange(message.getChatRoom().getRoomId(), messageId, userId, user.getUsername(), emoji,
                "REACTION_ADDED");
    }

    // Xóa reaction khỏi tin nhắn
    public void removeReaction(Long messageId, Long userId, String emoji) {
        // Kiểm tra reaction tồn tại
        MessageReaction reaction = reactionRepository
                .findByMessage_MessageIdAndUser_UserIdAndEmoji(messageId, userId, emoji)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy reaction"));

        Long roomId = reaction.getMessage().getChatRoom().getRoomId();
        String username = reaction.getUser().getUsername();

        reactionRepository.delete(reaction);

        log.info("User {} removed reaction {} from message {}", username, emoji, messageId);

        // Notify via WebSocket
        notifyReactionChange(roomId, messageId, userId, username, emoji, "REACTION_REMOVED");
    }

    // Lấy tất cả reactions của tin nhắn (grouped by emoji)
    @Transactional(readOnly = true)
    public Map<String, List<String>> getReactionsByMessageId(Long messageId) {
        List<MessageReaction> reactions = reactionRepository.findByMessage_MessageId(messageId);

        // Group by emoji -> list of usernames
        Map<String, List<String>> result = new HashMap<>();
        for (MessageReaction reaction : reactions) {
            String emoji = reaction.getEmoji();
            String username = reaction.getUser().getUsername();
            result.computeIfAbsent(emoji, k -> new ArrayList<>()).add(username);
        }

        return result;
    }

    // Notify WebSocket khi reaction thay đổi
    private void notifyReactionChange(Long roomId, Long messageId, Long userId, String username, String emoji,
            String eventType) {
        Map<String, Object> data = new HashMap<>();
        data.put("messageId", messageId);
        data.put("userId", userId);
        data.put("username", username);
        data.put("emoji", emoji);
        data.put("reactions", getReactionsByMessageId(messageId));

        webSocketNotificationService.sendNotificationToRoom(roomId, eventType, username + " " + emoji, data);
    }
}
