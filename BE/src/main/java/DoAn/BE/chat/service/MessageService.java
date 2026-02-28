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
import DoAn.BE.chat.repository.MessageReactionRepository;
import DoAn.BE.chat.repository.MessageRepository;
import DoAn.BE.chat.repository.MessageStatusRepository;
import java.util.stream.Collectors;
import java.util.List;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.dto.UserDTO;
import DoAn.BE.user.repository.UserRepository;
import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.chat.websocket.service.WebSocketNotificationService;
import DoAn.BE.notification.service.ChatNotificationService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;
import java.util.regex.Pattern;
import java.util.regex.Matcher;

import lombok.extern.slf4j.Slf4j;

@Service
@Transactional
@Slf4j
public class MessageService {

    private final MessageRepository messageRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final ChatRoomMemberRepository chatRoomMemberRepository;
    private final MessageStatusRepository messageStatusRepository;
    private final UserRepository userRepository;
    private final WebSocketNotificationService webSocketNotificationService;
    private final ChatNotificationService chatNotificationService;

    private final DoAn.BE.notification.service.FCMService fcmService;
    private final MessageReactionRepository reactionRepository;

    public MessageService(MessageRepository messageRepository,
            ChatRoomRepository chatRoomRepository,
            ChatRoomMemberRepository chatRoomMemberRepository,
            MessageStatusRepository messageStatusRepository,
            UserRepository userRepository,
            WebSocketNotificationService webSocketNotificationService,
            ChatNotificationService chatNotificationService,

            MessageReactionRepository reactionRepository,
            DoAn.BE.notification.service.FCMService fcmService) {
        this.messageRepository = messageRepository;
        this.chatRoomRepository = chatRoomRepository;
        this.chatRoomMemberRepository = chatRoomMemberRepository;
        this.messageStatusRepository = messageStatusRepository;
        this.userRepository = userRepository;
        this.webSocketNotificationService = webSocketNotificationService;
        this.chatNotificationService = chatNotificationService;

        this.reactionRepository = reactionRepository;
        this.fcmService = fcmService;
    }

    public MessDTO sendMessage(SendMessageRequest request, @NonNull Long senderId) {
        if (request.getRoomId() == null) {
            throw new BadRequestException("Room ID không được null");
        }
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("Người gửi không tồn tại"));

        ChatRoom chatRoom = chatRoomRepository.findById(request.getRoomId())
                .orElseThrow(() -> new ResourceNotFoundException("Phòng chat không tồn tại"));

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
        message.setCreatedAt(LocalDateTime.now());
        message.setIsDeleted(false);

        Message replyToMessage = null;
        if (request.getReplyToMessageId() != null) {
            replyToMessage = messageRepository.findById(request.getReplyToMessageId())
                    .orElseThrow(() -> new ResourceNotFoundException("Tin nhắn được reply không tồn tại"));

            if (!replyToMessage.getChatRoom().getRoomId().equals(request.getRoomId())) {
                throw new BadRequestException("Không thể reply tin nhắn từ phòng khác");
            }

            message.setReplyToMessage(replyToMessage);
        }

        message = messageRepository.save(message);

        // OPTIMIZED: Single query for members, reused for status + notifications
        List<ChatRoomMember> members = chatRoomMemberRepository.findByChatRoom_RoomId(request.getRoomId());

        // OPTIMIZED: Filter once for other members (excluding sender)
        List<ChatRoomMember> otherMembers = members.stream()
                .filter(member -> member.getUser() != null && member.getUser().getUserId() != null
                        && !member.getUser().getUserId().equals(senderId))
                .toList();

        // OPTIMIZED: Batch create MessageStatus instead of N saves
        LocalDateTime now = LocalDateTime.now();
        List<MessageStatus> statusList = new java.util.ArrayList<>();
        for (ChatRoomMember member : otherMembers) {
            MessageStatus status = new MessageStatus();
            status.setId(new MessageStatusId(message.getMessageId(), member.getUser().getUserId()));
            status.setMessage(message);
            status.setUser(member.getUser());
            status.setStatus(MessageStatus.MessageStatusType.DELIVERED);
            status.setTimestamp(now);
            statusList.add(status);
        }
        if (!statusList.isEmpty()) {
            messageStatusRepository.saveAll(statusList);
        }

        MessDTO messageDTO = convertToMessageDTO(message);

        webSocketNotificationService.notifyNewMessage(request.getRoomId(), messageDTO);

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

            // Push FCM notification
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
                            sender.getUsername(),
                            truncatedContent != null ? truncatedContent : "[Ảnh/Tệp]",
                            data);
                }
            } catch (Exception e) {
                log.warn("Failed to send FCM push to user {}: {}", member.getUser().getUserId(), e.getMessage());
            }
        }

        // Typing indicator handled via WebSocket, not REST

        // Detect and process mentions in message content
        processMentions(message, sender, chatRoom);

        return messageDTO;
    }

    private void processMentions(Message message, User sender, ChatRoom chatRoom) {
        String content = message.getContent();
        if (content == null || content.isEmpty()) {
            return;
        }
        processUserMentions(content, message, sender, chatRoom);
        processTaskIssueMentions(content, message, sender, chatRoom);
    }

    private void processUserMentions(String content, Message message, User sender, ChatRoom chatRoom) {
        Pattern userPattern = Pattern.compile("@(\\w+)");
        Matcher userMatcher = userPattern.matcher(content);
        while (userMatcher.find()) {
            String username = userMatcher.group(1);
            if (username.startsWith("TASK-") || username.startsWith("ISSUE-")) {
                continue;
            }
            Optional<User> mentionedUserOpt = userRepository.findByUsername(username);
            if (mentionedUserOpt.isPresent()) {
                User mentionedUser = mentionedUserOpt.get();
                notifyMentionedUser(mentionedUser, sender, message, chatRoom);
            }
        }
    }

    private void notifyMentionedUser(User mentionedUser, User sender, Message message, ChatRoom chatRoom) {
        boolean isMember = chatRoomMemberRepository.existsByChatRoom_RoomIdAndUser_UserId(
                chatRoom.getRoomId(), mentionedUser.getUserId());
        if (isMember && !mentionedUser.getUserId().equals(sender.getUserId())) {
            try {
                chatNotificationService.createMentionNotification(
                        mentionedUser.getUserId(),
                        sender.getUsername(),
                        chatRoom.getName() != null ? chatRoom.getName() : "Direct Message",
                        chatRoom.getRoomId());
            } catch (Exception e) {
                log.warn("Failed to send mention notification to {}: {}", mentionedUser.getUsername(), e.getMessage());
            }
        }
    }

    private void processTaskIssueMentions(String content, Message message, User sender, ChatRoom chatRoom) {
        Pattern taskPattern = Pattern.compile("@(TASK|ISSUE)-(\\w+)");
        Matcher taskMatcher = taskPattern.matcher(content);
        while (taskMatcher.find()) {
            String type = taskMatcher.group(1);
            String key = taskMatcher.group(2);
            String fullKey = type + "-" + key;
            log.debug("Phát hiện {} mention: {} trong tin nhắn {}", type, fullKey, message.getMessageId());
            if (chatRoom.getProject() != null) {
                chatNotificationService.createTaskMentionNotification(
                        sender.getUserId(),
                        sender.getUsername(),
                        fullKey,
                        "/projects/" + chatRoom.getProject().getProjectId() + "/issues/" + key);
            }

        }
    }

    public List<MessDTO> getMessagesByRoomId(@NonNull Long roomId, @NonNull Long userId, int page, int size) {
        // Validate phòng chat tồn tại
        chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Phòng chat không tồn tại"));

        // Kiểm tra user có trong phòng không
        boolean isMember = chatRoomMemberRepository.existsByChatRoom_RoomIdAndUser_UserId(roomId, userId);
        if (!isMember) {
            throw new BadRequestException("Bạn không có quyền xem tin nhắn trong phòng này");
        }
        Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
        Page<Message> messagePage = messageRepository.findByRoomIdPaged(roomId, pageable);

        // Convert sang DTO — reverse to ascending order for display
        List<MessDTO> result = messagePage.getContent().stream()
                .map(this::convertToMessageDTO)
                .collect(Collectors.toList());
        java.util.Collections.reverse(result);
        return result;
    }

    public void markMessageAsSeen(@NonNull Long messageId, @NonNull Long userId) {
        // Validate message tồn tại
        messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Tin nhắn không tồn tại"));

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

    private Message.MessageType detectMessageType(SendMessageRequest request) {
        if (request.getFileId() != null) {
            String fileName = request.getFileName();
            if (fileName != null && fileName.contains(".")) {
                String extension = fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase();
                if (List.of("jpg", "jpeg", "png", "gif", "webp").contains(extension)) {
                    return Message.MessageType.IMAGE;
                }
            }
            return Message.MessageType.FILE;
        }
        return Message.MessageType.TEXT;
    }

    public MessDTO convertToMessageDTO(Message message) {
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
        dto.setSentAt(message.getCreatedAt());
        dto.setIsDeleted(message.getIsDeleted());
        dto.setEditedAt(message.getUpdatedAt());
        dto.setIsEdited(message.getUpdatedAt() != null);
        dto.setReplyToMessageId(
                message.getReplyToMessage() != null ? message.getReplyToMessage().getMessageId() : null);

        // Populate replyTo DTO with quoted message info
        if (message.getReplyToMessage() != null) {
            Message parent = message.getReplyToMessage();
            String truncatedContent = parent.getContent() != null && parent.getContent().length() > 100
                    ? parent.getContent().substring(0, 97) + "..."
                    : parent.getContent();
            dto.setReplyTo(MessDTO.ReplyToDTO.builder()
                    .messageId(parent.getMessageId())
                    .senderName(parent.getSender() != null ? parent.getSender().getUsername() : "Unknown")
                    .content(truncatedContent)
                    .build());
        }

        // Populate reactions map (emoji -> list of usernames)
        Map<String, List<String>> reactions = new HashMap<>();
        reactionRepository.findByMessage_MessageId(message.getMessageId()).forEach(reaction -> {
            reactions.computeIfAbsent(reaction.getEmoji(), k -> new java.util.ArrayList<>())
                    .add(reaction.getUser().getUsername());
        });
        dto.setReactions(reactions);

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

    public List<MessDTO> searchMessages(@NonNull Long roomId, String keyword, @NonNull Long userId, Pageable pageable) {
        // Validate phòng chat tồn tại
        chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Phòng chat không tồn tại"));

        // Kiểm tra user có trong phòng không
        boolean isMember = chatRoomMemberRepository.existsByChatRoom_RoomIdAndUser_UserId(roomId, userId);
        if (!isMember) {
            throw new BadRequestException("Bạn không có quyền tìm kiếm trong phòng này");
        }
        Page<Message> messagePage = messageRepository.searchMessagesByContentPaged(roomId, keyword, pageable);

        return messagePage.getContent().stream()
                .map(this::convertToMessageDTO)
                .collect(Collectors.toList());
    }

    public MessDTO editMessage(@NonNull Long messageId, String newContent, @NonNull Long userId) {
        // Validate message tồn tại
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Tin nhắn không tồn tại"));

        // Kiểm tra quyền sửa (chỉ người gửi mới được sửa)
        if (!message.getSender().getUserId().equals(userId)) {
            throw new BadRequestException("Bạn chỉ có thể sửa tin nhắn của mình");
        }

        // Kiểm tra tin nhắn đã bị xóa chưa
        if (message.getIsDeleted()) {
            throw new BadRequestException("Không thể sửa tin nhắn đã bị xóa");
        }
        if (newContent == null || newContent.trim().isEmpty()) {
            throw new BadRequestException("Nội dung tin nhắn không được để trống");
        }

        // Cập nhật nội dung
        message.setContent(newContent);
        message.markAsEdited();

        message = messageRepository.save(message);

        MessDTO messageDTO = convertToMessageDTO(message);

        // Gửi WebSocket notification
        webSocketNotificationService.notifyMessageEdited(message.getChatRoom().getRoomId(), messageDTO);

        // Gửi notification cho các thành viên khác

        return messageDTO;
    }

    public void deleteMessage(@NonNull Long messageId, @NonNull Long userId) {
        // Validate message tồn tại
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Tin nhắn không tồn tại"));

        // Kiểm tra quyền xóa (chỉ người gửi mới được xóa)
        if (!message.getSender().getUserId().equals(userId)) {
            throw new BadRequestException("Bạn chỉ có thể xóa tin nhắn của mình");
        }

        // Soft delete
        message.setIsDeleted(true);
        messageRepository.save(message);

        // Gửi WebSocket notification
        webSocketNotificationService.notifyMessageDeleted(message.getChatRoom().getRoomId(), messageId, userId);

    }

    public long countMessagesByRoomId(Long roomId) {
        return messageRepository.countByRoomId(roomId);
    }
}
