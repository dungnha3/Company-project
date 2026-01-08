package DoAn.BE.chat.service;

import DoAn.BE.chat.entity.MessageStatus;
import DoAn.BE.chat.entity.MessageStatusId;
import DoAn.BE.chat.repository.MessageRepository;
import DoAn.BE.chat.repository.MessageStatusRepository;
import DoAn.BE.common.exception.EntityNotFoundException;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@Transactional
public class MessageStatusService {

    private final MessageStatusRepository messageStatusRepository;
    private final MessageRepository messageRepository;

    public MessageStatusService(MessageStatusRepository messageStatusRepository, MessageRepository messageRepository) {
        this.messageStatusRepository = messageStatusRepository;
        this.messageRepository = messageRepository;
    }

    // Đánh dấu tin nhắn đã gửi
    public void markMessageAsDelivered(@NonNull Long messageId, @NonNull Long userId) {
        messageRepository.findById(messageId)
                .orElseThrow(() -> new EntityNotFoundException("Tin nhắn không tồn tại"));

        Optional<MessageStatus> statusOpt = messageStatusRepository.findById(
                new MessageStatusId(messageId, userId));

        if (statusOpt.isPresent()) {
            MessageStatus status = statusOpt.get();
            status.setStatus(MessageStatus.MessageStatusType.DELIVERED);
            status.setTimestamp(LocalDateTime.now());
            messageStatusRepository.save(status);
        }
    }

    // Đánh dấu tin nhắn đã đọc
    public void markMessageAsSeen(@NonNull Long messageId, @NonNull Long userId) {
        messageRepository.findById(messageId)
                .orElseThrow(() -> new EntityNotFoundException("Tin nhắn không tồn tại"));

        Optional<MessageStatus> statusOpt = messageStatusRepository.findById(
                new MessageStatusId(messageId, userId));

        if (statusOpt.isPresent()) {
            MessageStatus status = statusOpt.get();
            status.setStatus(MessageStatus.MessageStatusType.SEEN);
            status.setTimestamp(LocalDateTime.now());
            messageStatusRepository.save(status);
        }
    }

    // [OPTIMIZED: Bulk update instead of N method calls in loop]
    public void markAllMessagesAsSeen(@NonNull Long roomId, @NonNull Long userId) {
        messageStatusRepository.markAllAsSeenInRoom(roomId, userId, LocalDateTime.now());
    }

    // Đếm số tin nhắn chưa đọc trong phòng
    public Long getUnreadCount(@NonNull Long roomId, @NonNull Long userId) {
        return messageStatusRepository.countUnreadMessagesInRoom(roomId, userId);
    }
}
