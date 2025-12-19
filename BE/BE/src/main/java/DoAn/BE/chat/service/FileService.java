package DoAn.BE.chat.service;

import DoAn.BE.chat.dto.MessDTO;
import DoAn.BE.chat.dto.SendMessageRequest;
import DoAn.BE.chat.entity.ChatRoom;
import DoAn.BE.chat.entity.ChatRoomMember;
import DoAn.BE.chat.entity.Message;
import DoAn.BE.chat.entity.MessageStatus;
import DoAn.BE.chat.repository.ChatRoomRepository;
import DoAn.BE.chat.repository.ChatRoomMemberRepository;
import DoAn.BE.chat.repository.MessageRepository;
import DoAn.BE.chat.repository.MessageStatusRepository;
import DoAn.BE.storage.repository.FileRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.dto.UserDTO;
import DoAn.BE.user.repository.UserRepository;
import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class FileService {

    private final FileRepository fileRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final ChatRoomMemberRepository chatRoomMemberRepository;
    private final MessageRepository messageRepository;
    private final MessageStatusRepository messageStatusRepository;
    private final UserRepository userRepository;
    private final DoAn.BE.chat.websocket.service.WebSocketNotificationService webSocketNotificationService;

    public FileService(FileRepository fileRepository,
            ChatRoomRepository chatRoomRepository,
            ChatRoomMemberRepository chatRoomMemberRepository,
            MessageRepository messageRepository,
            MessageStatusRepository messageStatusRepository,
            UserRepository userRepository,
            DoAn.BE.chat.websocket.service.WebSocketNotificationService webSocketNotificationService) {
        this.fileRepository = fileRepository;
        this.chatRoomRepository = chatRoomRepository;
        this.chatRoomMemberRepository = chatRoomMemberRepository;
        this.messageRepository = messageRepository;
        this.messageStatusRepository = messageStatusRepository;
        this.userRepository = userRepository;
        this.webSocketNotificationService = webSocketNotificationService;
    }

    // Gửi tin nhắn có file đính kèm
    public MessDTO sendMessageWithFile(SendMessageRequest request, Long senderId) {
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new EntityNotFoundException("Người gửi không tồn tại"));

        ChatRoom chatRoom = chatRoomRepository.findById(request.getRoomId())
                .orElseThrow(() -> new EntityNotFoundException("Phòng chat không tồn tại"));

        boolean isMember = chatRoomMemberRepository.existsByChatRoom_RoomIdAndUser_UserId(request.getRoomId(),
                senderId);
        if (!isMember) {
            throw new BadRequestException("Bạn không có quyền gửi tin nhắn trong phòng này");
        }

        if (request.getFileId() == null) {
            throw new BadRequestException("File ID không được để trống");
        }

        DoAn.BE.storage.entity.File file = fileRepository.findById(request.getFileId())
                .orElseThrow(() -> new EntityNotFoundException("File không tồn tại"));

        Message message = new Message();
        message.setChatRoom(chatRoom);
        message.setSender(sender);
        message.setContent(request.getContent());
        message.setMessageType(detectMessageType(request));
        message.setFile(file);
        message.setSentAt(LocalDateTime.now());
        message.setIsDeleted(false);

        message = messageRepository.save(message);

        List<ChatRoomMember> members = chatRoomMemberRepository.findByChatRoom_RoomId(request.getRoomId());
        for (ChatRoomMember member : members) {
            if (member.getUser() != null && !member.getUser().getUserId().equals(senderId)) {
                MessageStatus status = new MessageStatus();
                status.setMessage(message);
                status.setUser(member.getUser());
                status.setStatus(MessageStatus.MessageStatusType.DELIVERED);
                status.setTimestamp(LocalDateTime.now());
                messageStatusRepository.save(status);
            }
        }

        MessDTO messageDTO = convertToMessageDTO(message);

        // Gửi notification qua WebSocket
        webSocketNotificationService.sendNotificationToRoom(
                request.getRoomId(),
                "CHAT_MESSAGE",
                request.getContent() != null ? request.getContent() : (request.getFileId() != null ? "[File]" : ""),
                messageDTO);

        return messageDTO;
    }

    // Upload file và gửi tin nhắn
    public MessDTO uploadAndSendFile(MultipartFile file, Long roomId, String content, Long senderId) {
        if (file.isEmpty()) {
            throw new BadRequestException("File không được để trống");
        }

        if (file.getSize() > 10 * 1024 * 1024) { // Max 10MB
            throw new BadRequestException("File không được vượt quá 10MB");
        }

        String contentType = file.getContentType();
        if (contentType == null || (!contentType.startsWith("image/") && !contentType.startsWith("application/"))) {
            throw new BadRequestException("Loại file không được hỗ trợ");
        }

        DoAn.BE.storage.entity.File fileEntity = new DoAn.BE.storage.entity.File();
        fileEntity.setOriginalFilename(file.getOriginalFilename());
        fileEntity.setFilename(file.getOriginalFilename());
        fileEntity.setFileSize(file.getSize());
        fileEntity.setMimeType(contentType);
        // NOTE: Path tạm thời - cần tích hợp với FileStorageService để lưu file thực tế
        fileEntity.setFilePath("/uploads/" + file.getOriginalFilename());
        fileEntity = fileRepository.save(fileEntity);

        SendMessageRequest request = new SendMessageRequest();
        request.setRoomId(roomId);
        request.setContent(content);
        request.setFileId(fileEntity.getFileId());
        request.setFileName(fileEntity.getOriginalFilename());
        request.setFileUrl(fileEntity.getFilePath());
        request.setFileSize(fileEntity.getFileSize());
        request.setFileType(fileEntity.getMimeType());

        return sendMessageWithFile(request, senderId);
    }

    // Upload và gửi hình ảnh
    public MessDTO uploadAndSendImage(MultipartFile imageFile, Long roomId, String caption, Long senderId) {
        if (imageFile.isEmpty()) {
            throw new BadRequestException("Hình ảnh không được để trống");
        }

        if (imageFile.getSize() > 5 * 1024 * 1024) { // Max 5MB cho ảnh
            throw new BadRequestException("Hình ảnh không được vượt quá 5MB");
        }

        String contentType = imageFile.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new BadRequestException("Chỉ được phép gửi file hình ảnh");
        }

        String fileName = imageFile.getOriginalFilename();
        if (fileName == null || !isValidImageFormat(fileName)) {
            throw new BadRequestException("Định dạng ảnh không được hỗ trợ. Chỉ hỗ trợ: JPG, JPEG, PNG, GIF, WEBP");
        }

        DoAn.BE.storage.entity.File imageEntity = new DoAn.BE.storage.entity.File();
        imageEntity.setOriginalFilename(fileName);
        imageEntity.setFilename(fileName);
        imageEntity.setFileSize(imageFile.getSize());
        imageEntity.setMimeType(contentType);
        // NOTE: Path tạm thời - cần tích hợp với FileStorageService để lưu ảnh thực tế
        imageEntity.setFilePath("/uploads/images/" + fileName);
        imageEntity = fileRepository.save(imageEntity);

        SendMessageRequest request = new SendMessageRequest();
        request.setRoomId(roomId);
        request.setContent(caption);
        request.setFileId(imageEntity.getFileId());
        request.setFileName(imageEntity.getOriginalFilename());
        request.setFileUrl(imageEntity.getFilePath());
        request.setFileSize(imageEntity.getFileSize());
        request.setFileType(imageEntity.getMimeType());
        request.setMessageType(Message.MessageType.IMAGE);

        return sendMessageWithFile(request, senderId);
    }

    // Lấy danh sách file trong phòng chat
    public List<MessDTO> getFilesByRoomId(Long roomId, Long userId) {
        chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new EntityNotFoundException("Phòng chat không tồn tại"));

        boolean isMember = chatRoomMemberRepository.existsByChatRoom_RoomIdAndUser_UserId(roomId, userId);
        if (!isMember) {
            throw new BadRequestException("Bạn không có quyền xem file trong phòng này");
        }

        List<Message> messages = messageRepository.findByChatRoom_RoomIdOrderBySentAtAsc(roomId);

        return messages.stream()
                .filter(message -> message.getFile() != null)
                .map(this::convertToMessageDTO)
                .collect(Collectors.toList());
    }

    // Lấy danh sách hình ảnh trong phòng chat
    public List<MessDTO> getImagesByRoomId(Long roomId, Long userId) {
        chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new EntityNotFoundException("Phòng chat không tồn tại"));

        boolean isMember = chatRoomMemberRepository.existsByChatRoom_RoomIdAndUser_UserId(roomId, userId);
        if (!isMember) {
            throw new BadRequestException("Bạn không có quyền xem hình ảnh trong phòng này");
        }

        List<Message> messages = messageRepository.findByChatRoom_RoomIdOrderBySentAtAsc(roomId);

        return messages.stream()
                .filter(message -> message.getMessageType() == Message.MessageType.IMAGE)
                .map(this::convertToMessageDTO)
                .collect(Collectors.toList());
    }

    // Kiểm tra định dạng ảnh hợp lệ
    private boolean isValidImageFormat(String fileName) {
        String extension = fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase();
        return List.of("jpg", "jpeg", "png", "gif", "webp", "bmp").contains(extension);
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

        return dto;
    }
}
