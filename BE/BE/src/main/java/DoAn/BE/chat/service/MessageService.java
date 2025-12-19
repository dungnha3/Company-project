package DoAn.BE.chat.service;

import DoAn.BE.chat.dto.MessDTO;
import DoAn.BE.chat.dto.SendMessageRequest;
import DoAn.BE.chat.entity.ChatRoom;
import DoAn.BE.chat.entity.ChatRoomMember;
import DoAn.BE.chat.entity.Message;
import DoAn.BE.chat.entity.MessageStatus;
import DoAn.BE.chat.entity.MessageStatusId;
import DoAn.BE.chat.repository.ChatRoomRepository;
import DoAn.BE.chat.repository.ChatRoomMemberRepository;
import DoAn.BE.chat.repository.MessageRepository;
import DoAn.BE.chat.repository.MessageStatusRepository;
import java.util.stream.Collectors;
import java.util.List;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.dto.UserDTO;
import DoAn.BE.user.repository.UserRepository;
import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.EntityNotFoundException;
import DoAn.BE.chat.websocket.service.WebSocketNotificationService;
import DoAn.BE.notification.service.ChatNotificationService;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;
import java.util.regex.Pattern;
import java.util.regex.Matcher;
import org.springframework.data.domain.Pageable;

@Service
@Transactional
public class MessageService {

    private final MessageRepository messageRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final ChatRoomMemberRepository chatRoomMemberRepository;
    private final MessageStatusRepository messageStatusRepository;
    private final UserRepository userRepository;
    private final WebSocketNotificationService webSocketNotificationService;
    private final ChatNotificationService chatNotificationService;
    private final TypingIndicatorService typingIndicatorService;
    private final DoAn.BE.notification.service.FCMService fcmService;

    public MessageService(MessageRepository messageRepository,
            ChatRoomRepository chatRoomRepository,
            ChatRoomMemberRepository chatRoomMemberRepository,
            MessageStatusRepository messageStatusRepository,
            UserRepository userRepository,
            WebSocketNotificationService webSocketNotificationService,
            ChatNotificationService chatNotificationService,
            TypingIndicatorService typingIndicatorService,
            DoAn.BE.notification.service.FCMService fcmService) {
        this.messageRepository = messageRepository;
        this.chatRoomRepository = chatRoomRepository;
        this.chatRoomMemberRepository = chatRoomMemberRepository;
        this.messageStatusRepository = messageStatusRepository;
        this.userRepository = userRepository;
        this.webSocketNotificationService = webSocketNotificationService;
        this.chatNotificationService = chatNotificationService;
        this.typingIndicatorService = typingIndicatorService;
        this.fcmService = fcmService;
    }

    // Gửi tin nhắn
    public MessDTO sendMessage(SendMessageRequest request, @NonNull Long senderId) {
        if (request.getRoomId() == null) {
            throw new BadRequestException("Room ID không được null");
        }
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new EntityNotFoundException("Người gửi không tồn tại"));

        ChatRoom chatRoom = chatRoomRepository.findById(request.getRoomId())
                .orElseThrow(() -> new EntityNotFoundException("Phòng chat không tồn tại"));

        boolean isMember = chatRoomMemberRepository.existsByChatRoom_RoomIdAndUser_UserId(request.getRoomId(),
                senderId);
        if (!isMember) {
            throw new BadRequestException("Bạn không có quyền gửi tin nhắn trong phòng này");
        }

        Message message = new Message();
        message.setChatRoom(chatRoom);
        message.setSender(sender);
        message.setContent(request.getContent());
        message.setMessageType(detectMessageType(request));
        message.setSentAt(LocalDateTime.now());
        message.setIsDeleted(false);

        Message replyToMessage = null;
        if (request.getReplyToMessageId() != null) {
            replyToMessage = messageRepository.findById(request.getReplyToMessageId())
                    .orElseThrow(() -> new EntityNotFoundException("Tin nhắn được reply không tồn tại"));

            if (!replyToMessage.getChatRoom().getRoomId().equals(request.getRoomId())) {
                throw new BadRequestException("Không thể reply tin nhắn từ phòng khác");
            }

            message.setReplyToMessage(replyToMessage);
        }

        message = messageRepository.save(message);

        List<ChatRoomMember> members = chatRoomMemberRepository.findByChatRoom_RoomId(request.getRoomId());
        for (ChatRoomMember member : members) {
            if (member.getUser() != null && member.getUser().getUserId() != null
                    && !member.getUser().getUserId().equals(senderId)) {
                MessageStatus status = new MessageStatus();
                status.setId(new MessageStatusId(message.getMessageId(), member.getUser().getUserId()));
                status.setMessage(message);
                status.setUser(member.getUser());
                status.setStatus(MessageStatus.MessageStatusType.DELIVERED);
                status.setTimestamp(LocalDateTime.now());
                messageStatusRepository.save(status);
            }
        }

        MessDTO messageDTO = convertToMessageDTO(message);

        webSocketNotificationService.notifyNewMessage(request.getRoomId(), messageDTO);

        List<ChatRoomMember> otherMembers = chatRoomMemberRepository.findByChatRoom_RoomId(request.getRoomId())
                .stream()
                .filter(member -> member.getUser() != null && member.getUser().getUserId() != null
                        && !member.getUser().getUserId().equals(senderId))
                .toList();

        // Nếu là reply, gửi notification đặc biệt cho người được reply
        if (replyToMessage != null && replyToMessage.getSender() != null
                && !replyToMessage.getSender().getUserId().equals(senderId)) {
            chatNotificationService.createMessageRepliedNotification(
                    replyToMessage.getSender().getUserId(),
                    sender.getUsername(),
                    request.getContent(),
                    request.getRoomId());
        }

        // Gửi notification tin nhắn mới cho các members khác (trừ người gửi và người
        // được reply)
        for (ChatRoomMember member : otherMembers) {
            // Bỏ qua nếu đã gửi reply notification cho user này
            if (replyToMessage != null && replyToMessage.getSender() != null
                    && member.getUser().getUserId().equals(replyToMessage.getSender().getUserId())) {
                continue;
            }

            chatNotificationService.createNewMessageNotification(
                    member.getUser().getUserId(),
                    sender.getUsername(),
                    request.getContent(),
                    request.getRoomId());

            // 📱 Push FCM notification
            try {
                if (member.getUser().getFcmToken() != null) {
                    String truncatedContent = request.getContent();
                    if (truncatedContent != null && truncatedContent.length() > 100) {
                        truncatedContent = truncatedContent.substring(0, 97) + "...";
                    }

                    Map<String, String> data = new HashMap<>();
                    data.put("type", "CHAT_NEW_MESSAGE");
                    data.put("roomId", request.getRoomId().toString());
                    data.put("link", "/chat/rooms/" + request.getRoomId());
                    fcmService.sendToDevice(
                            member.getUser().getFcmToken(),
                            "💬 " + sender.getUsername(),
                            truncatedContent != null ? truncatedContent : "[Ảnh/Tệp]",
                            data);
                }
            } catch (Exception e) {
                // Log but don't fail
            }
        }

        typingIndicatorService.forceStopTyping(request.getRoomId(), senderId);

        // Detect and process mentions in message content
        processMentions(message, sender, chatRoom);

        return messageDTO;
    }

    /**
     * Phát hiện và xử lý mentions trong message
     * Hỗ trợ: @username, @TASK-123, @ISSUE-456
     */
    private void processMentions(Message message, User sender, ChatRoom chatRoom) {
        String content = message.getContent();
        if (content == null || content.isEmpty()) {
            return;
        }

        // Pattern 1: @username - mention user
        Pattern userPattern = Pattern.compile("@(\\w+)");
        Matcher userMatcher = userPattern.matcher(content);
        while (userMatcher.find()) {
            String username = userMatcher.group(1);

            // Skip if it's a task/issue pattern
            if (content.contains("@TASK-") || content.contains("@ISSUE-")) {
                continue;
            }

            // Find user and send notification
            Optional<User> mentionedUserOpt = userRepository.findByUsername(username);
            if (mentionedUserOpt.isPresent()) {
                User mentionedUser = mentionedUserOpt.get();

                // Check if mentioned user is in the chat room
                boolean isMember = chatRoomMemberRepository.existsByChatRoom_RoomIdAndUser_UserId(
                        chatRoom.getRoomId(), mentionedUser.getUserId());

                if (isMember && !mentionedUser.getUserId().equals(sender.getUserId())) {
                    // Send special mention notification
                    chatNotificationService.createChatNotification(
                            mentionedUser.getUserId(),
                            "MENTION",
                            sender.getUsername() + " đã nhắc đến bạn",
                            message.getContent().length() > 100
                                    ? message.getContent().substring(0, 97) + "..."
                                    : message.getContent(),
                            "/chat/rooms/" + chatRoom.getRoomId());
                }
            }
        }

        // Pattern 2: @TASK-123 hoặc @ISSUE-456
        Pattern taskPattern = Pattern.compile("@(TASK|ISSUE)-(\\w+)");
        Matcher taskMatcher = taskPattern.matcher(content);
        while (taskMatcher.find()) {
            String type = taskMatcher.group(1);
            String key = taskMatcher.group(2);
            String fullKey = type + "-" + key;

            // Log mention for potential future processing
            // Could send notification to task/issue assignee here
            // For now, just log it
            System.out
                    .println("🔗 Detected " + type + " mention: " + fullKey + " in message " + message.getMessageId());

            // TODO: Query task/issue and notify assignee if needed
            // Task task = taskRepository.findByKey(fullKey);
            // if (task != null && task.getAssignee() != null) {
            // // Send notification to assignee
            // }
        }
    }

    // Lấy tin nhắn trong phòng chat
    public List<MessDTO> getMessagesByRoomId(@NonNull Long roomId, @NonNull Long userId, int page, int size) {
        // Validate phòng chat tồn tại
        chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new EntityNotFoundException("Phòng chat không tồn tại"));

        // Kiểm tra user có trong phòng không
        boolean isMember = chatRoomMemberRepository.existsByChatRoom_RoomIdAndUser_UserId(roomId, userId);
        if (!isMember) {
            throw new BadRequestException("Bạn không có quyền xem tin nhắn trong phòng này");
        }

        // Lấy tin nhắn với phân trang
        List<Message> messages = messageRepository.findByChatRoom_RoomIdOrderBySentAtAsc(roomId);

        // Convert sang DTO
        return messages.stream()
                .map(this::convertToMessageDTO)
                .collect(Collectors.toList());
    }

    // Đánh dấu tin nhắn đã đọc
    public void markMessageAsSeen(@NonNull Long messageId, @NonNull Long userId) {
        // Validate message tồn tại
        messageRepository.findById(messageId)
                .orElseThrow(() -> new EntityNotFoundException("Tin nhắn không tồn tại"));

        // Tìm MessageStatus
        Optional<MessageStatus> statusOpt = messageStatusRepository.findById(
                new MessageStatusId(messageId, userId));

        if (statusOpt.isPresent()) {
            MessageStatus status = statusOpt.get();
            if (status.getStatus() != MessageStatus.MessageStatusType.SEEN) {
                status.setStatus(MessageStatus.MessageStatusType.SEEN);
                status.setTimestamp(LocalDateTime.now());
                messageStatusRepository.save(status);

                // Gửi notification qua WebSocket
                webSocketNotificationService.notifyMessageSeen(
                        status.getMessage().getChatRoom().getRoomId(),
                        messageId,
                        userId,
                        status.getUser().getUsername(),
                        status.getUser().getAvatarUrl());
            }
        }
    }

    // Tự động xác định loại tin nhắn
    private Message.MessageType detectMessageType(SendMessageRequest request) {
        if (request.getFileId() != null) {
            String fileName = request.getFileName();
            if (fileName != null) {
                String extension = fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase();
                if (List.of("jpg", "jpeg", "png", "gif", "webp").contains(extension)) {
                    return Message.MessageType.IMAGE;
                }
            }
            return Message.MessageType.FILE;
        }
        return Message.MessageType.TEXT;
    }

    // Chuyển đổi Message entity sang DTO
    private MessDTO convertToMessageDTO(Message message) {
        MessDTO dto = new MessDTO();
        dto.setMessageId(message.getMessageId());
        dto.setRoomId(message.getChatRoom().getRoomId());

        UserDTO senderDTO = new UserDTO();
        senderDTO.setUserId(message.getSender().getUserId());
        senderDTO.setUsername(message.getSender().getUsername());
        senderDTO.setEmail(message.getSender().getEmail());
        senderDTO.setAvatarUrl(message.getSender().getAvatarUrl());
        dto.setSender(senderDTO);

        dto.setContent(message.getContent());
        dto.setMessageType(message.getMessageType());
        dto.setFileId(message.getFile() != null ? message.getFile().getFileId() : null);
        dto.setFileName(message.getFile() != null ? message.getFile().getOriginalFilename() : null);
        dto.setFileUrl(message.getFile() != null ? message.getFile().getFilePath() : null);
        dto.setSentAt(message.getSentAt());
        dto.setIsDeleted(message.getIsDeleted());
        dto.setEditedAt(message.getEditedAt());
        dto.setIsEdited(message.getEditedAt() != null);
        dto.setReplyToMessageId(
                message.getReplyToMessage() != null ? message.getReplyToMessage().getMessageId() : null);

        // Populate seenBy list
        List<UserDTO> seenBy = messageStatusRepository
                .findByMessage_MessageIdAndStatus(message.getMessageId(), MessageStatus.MessageStatusType.SEEN)
                .stream()
                .map(status -> {
                    User u = status.getUser();
                    UserDTO uDTO = new UserDTO();
                    uDTO.setUserId(u.getUserId());
                    uDTO.setUsername(u.getUsername());
                    uDTO.setAvatarUrl(u.getAvatarUrl());
                    return uDTO;
                })
                .collect(Collectors.toList());
        dto.setSeenBy(seenBy);

        return dto;
    }

    // Tìm kiếm tin nhắn theo nội dung
    public List<MessDTO> searchMessages(@NonNull Long roomId, String keyword, @NonNull Long userId, Pageable pageable) {
        // Validate phòng chat tồn tại
        chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new EntityNotFoundException("Phòng chat không tồn tại"));

        // Kiểm tra user có trong phòng không
        boolean isMember = chatRoomMemberRepository.existsByChatRoom_RoomIdAndUser_UserId(roomId, userId);
        if (!isMember) {
            throw new BadRequestException("Bạn không có quyền tìm kiếm trong phòng này");
        }

        // Tìm kiếm tin nhắn
        List<Message> messages = messageRepository.searchMessagesByContent(roomId, keyword);

        // Apply pagination manually
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), messages.size());
        List<Message> pagedMessages = messages.subList(start, end);

        return pagedMessages.stream()
                .map(this::convertToMessageDTO)
                .collect(Collectors.toList());
    }

    // Tìm kiếm tin nhắn theo người gửi
    public List<MessDTO> searchMessagesBySender(@NonNull Long roomId, String senderKeyword, @NonNull Long userId) {
        // Validate permissions
        validateRoomAccess(roomId, userId);

        List<Message> messages = messageRepository.searchMessagesBySender(roomId, senderKeyword);

        return messages.stream()
                .map(this::convertToMessageDTO)
                .collect(Collectors.toList());
    }

    // Tìm kiếm tin nhắn theo khoảng thời gian
    public List<MessDTO> searchMessagesByDateRange(@NonNull Long roomId, LocalDateTime startDate, LocalDateTime endDate,
            @NonNull Long userId) {
        // Validate permissions
        validateRoomAccess(roomId, userId);

        List<Message> messages = messageRepository.searchMessagesByDateRange(roomId, startDate, endDate);

        return messages.stream()
                .map(this::convertToMessageDTO)
                .collect(Collectors.toList());
    }

    // Tìm kiếm tin nhắn theo loại
    public List<MessDTO> searchMessagesByType(@NonNull Long roomId, Message.MessageType messageType,
            @NonNull Long userId) {
        // Validate permissions
        validateRoomAccess(roomId, userId);

        List<Message> messages = messageRepository.searchMessagesByType(roomId, messageType);

        return messages.stream()
                .map(this::convertToMessageDTO)
                .collect(Collectors.toList());
    }

    // Sửa tin nhắn
    public MessDTO editMessage(@NonNull Long messageId, String newContent, @NonNull Long userId) {
        // Validate message tồn tại
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new EntityNotFoundException("Tin nhắn không tồn tại"));

        // Kiểm tra quyền sửa (chỉ người gửi mới được sửa)
        if (!message.getSender().getUserId().equals(userId)) {
            throw new BadRequestException("Bạn chỉ có thể sửa tin nhắn của mình");
        }

        // Kiểm tra tin nhắn đã bị xóa chưa
        if (message.getIsDeleted()) {
            throw new BadRequestException("Không thể sửa tin nhắn đã bị xóa");
        }

        // Cập nhật nội dung
        message.setContent(newContent);
        message.markAsEdited();

        message = messageRepository.save(message);

        MessDTO messageDTO = convertToMessageDTO(message);

        // Gửi WebSocket notification
        webSocketNotificationService.notifyMessageEdited(message.getChatRoom().getRoomId(), messageDTO);

        // Gửi notification cho các thành viên khác
        final Message finalMessage = message;
        List<ChatRoomMember> otherMembers = chatRoomMemberRepository
                .findByChatRoom_RoomId(finalMessage.getChatRoom().getRoomId())
                .stream()
                .filter(member -> !member.getUser().getUserId().equals(finalMessage.getSender().getUserId()))
                .toList();

        for (ChatRoomMember member : otherMembers) {
            chatNotificationService.createChatNotification(
                    member.getUser().getUserId(),
                    "MESSAGE_EDITED",
                    "Tin nhắn đã được sửa",
                    finalMessage.getSender().getUsername() + " đã sửa tin nhắn",
                    "/chat/rooms/" + finalMessage.getChatRoom().getRoomId());
        }

        return messageDTO;
    }

    // Xóa tin nhắn (soft delete)
    public void deleteMessage(@NonNull Long messageId, @NonNull Long userId) {
        // Validate message tồn tại
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new EntityNotFoundException("Tin nhắn không tồn tại"));

        // Kiểm tra quyền xóa (chỉ người gửi mới được xóa)
        if (!message.getSender().getUserId().equals(userId)) {
            throw new BadRequestException("Bạn chỉ có thể xóa tin nhắn của mình");
        }

        // Soft delete
        message.setIsDeleted(true);
        messageRepository.save(message);

        // Gửi WebSocket notification
        webSocketNotificationService.notifyMessageDeleted(message.getChatRoom().getRoomId(), messageId, userId);

        // Gửi notification cho các thành viên khác
        User deleter = userRepository.findById(userId).orElse(null);
        if (deleter != null) {
            final Message finalMessage = message;
            List<ChatRoomMember> otherMembers = chatRoomMemberRepository
                    .findByChatRoom_RoomId(finalMessage.getChatRoom().getRoomId())
                    .stream()
                    .filter(member -> !member.getUser().getUserId().equals(deleter.getUserId()))
                    .toList();

            for (ChatRoomMember member : otherMembers) {
                chatNotificationService.createChatNotification(
                        member.getUser().getUserId(),
                        "MESSAGE_DELETED",
                        "Tin nhắn đã bị xóa",
                        deleter.getUsername() + " đã xóa tin nhắn",
                        "/chat/rooms/" + finalMessage.getChatRoom().getRoomId());
            }
        }
    }

    // Kiểm tra quyền truy cập phòng
    private void validateRoomAccess(@NonNull Long roomId, @NonNull Long userId) {
        chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new EntityNotFoundException("Phòng chat không tồn tại"));

        boolean isMember = chatRoomMemberRepository.existsByChatRoom_RoomIdAndUser_UserId(roomId, userId);
        if (!isMember) {
            throw new BadRequestException("Bạn không có quyền truy cập phòng này");
        }
    }
}
