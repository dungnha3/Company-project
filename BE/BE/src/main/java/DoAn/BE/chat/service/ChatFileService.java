package DoAn.BE.chat.service;

import DoAn.BE.chat.dto.MessDTO;
import DoAn.BE.chat.dto.SendMessageRequest;
import DoAn.BE.chat.entity.Message;
import DoAn.BE.chat.repository.ChatRoomMemberRepository;
import DoAn.BE.chat.repository.ChatRoomRepository;
import DoAn.BE.chat.repository.MessageRepository;
import DoAn.BE.storage.dto.FileUploadResponse;
import DoAn.BE.storage.entity.File;
import DoAn.BE.storage.repository.FileRepository;
import DoAn.BE.storage.service.FileStorageService;
import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.EntityNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.stream.Collectors;

// Chat File Service - handles file/image upload for chat messages
// SRP: Only handles chat-specific file logic - delegates to FileStorageService + MessageService
@Service
@Transactional
@Slf4j
public class ChatFileService {

    private final FileStorageService fileStorageService;
    private final MessageService messageService;
    private final ChatRoomRepository chatRoomRepository;
    private final ChatRoomMemberRepository chatRoomMemberRepository;
    private final MessageRepository messageRepository;
    private final FileRepository fileRepository;

    public ChatFileService(FileStorageService fileStorageService,
            MessageService messageService,
            ChatRoomRepository chatRoomRepository,
            ChatRoomMemberRepository chatRoomMemberRepository,
            MessageRepository messageRepository,
            FileRepository fileRepository) {
        this.fileStorageService = fileStorageService;
        this.messageService = messageService;
        this.chatRoomRepository = chatRoomRepository;
        this.chatRoomMemberRepository = chatRoomMemberRepository;
        this.messageRepository = messageRepository;
        this.fileRepository = fileRepository;
    }

    // Upload file và gửi tin nhắn chứa file
    public MessDTO uploadAndSendFile(MultipartFile file, Long roomId, String content, Long senderId) {
        validateFileUpload(file, roomId, senderId);

        if (file.getSize() > 10 * 1024 * 1024) {
            throw new BadRequestException("File không được vượt quá 10MB");
        }

        FileUploadResponse uploadResponse = fileStorageService.uploadFile(file, null, senderId, null, null);

        log.info("Chat file uploaded: {} for room {}", uploadResponse.getOriginalFilename(), roomId);

        SendMessageRequest request = new SendMessageRequest();
        request.setRoomId(roomId);
        request.setContent(content);
        request.setFileId(uploadResponse.getFileId());
        request.setFileName(uploadResponse.getOriginalFilename());
        request.setFileUrl(uploadResponse.getDownloadUrl());
        request.setFileSize(uploadResponse.getFileSize());
        request.setFileType(uploadResponse.getMimeType());
        request.setMessageType(detectMessageType(file.getContentType(), uploadResponse.getOriginalFilename()));

        return messageService.sendMessage(request, senderId);
    }

    // Upload hình ảnh và gửi tin nhắn
    public MessDTO uploadAndSendImage(MultipartFile imageFile, Long roomId, String caption, Long senderId) {
        validateFileUpload(imageFile, roomId, senderId);

        if (imageFile.getSize() > 5 * 1024 * 1024) {
            throw new BadRequestException("Hình ảnh không được vượt quá 5MB");
        }

        String contentType = imageFile.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new BadRequestException("Chỉ được phép gửi file hình ảnh");
        }

        if (!isValidImageFormat(imageFile.getOriginalFilename())) {
            throw new BadRequestException("Định dạng ảnh không được hỗ trợ. Chỉ hỗ trợ: JPG, JPEG, PNG, GIF, WEBP");
        }

        FileUploadResponse uploadResponse = fileStorageService.uploadFile(imageFile, null, senderId, null, null);

        log.info("Chat image uploaded: {} for room {}", uploadResponse.getOriginalFilename(), roomId);

        SendMessageRequest request = new SendMessageRequest();
        request.setRoomId(roomId);
        request.setContent(caption);
        request.setFileId(uploadResponse.getFileId());
        request.setFileName(uploadResponse.getOriginalFilename());
        request.setFileUrl(uploadResponse.getDownloadUrl());
        request.setFileSize(uploadResponse.getFileSize());
        request.setFileType(uploadResponse.getMimeType());
        request.setMessageType(Message.MessageType.IMAGE);

        return messageService.sendMessage(request, senderId);
    }

    // Gửi file đã tồn tại từ Storage vào chat
    public MessDTO sendExistingFile(Long fileId, Long roomId, String content, Long senderId) {
        validateRoomAccess(roomId, senderId);

        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> new EntityNotFoundException("File không tồn tại trong Storage"));

        // Kiểm tra user có quyền truy cập file không (người upload hoặc file public)
        if (!file.getOwner().getUserId().equals(senderId) && !file.getIsPublic()) {
            throw new BadRequestException("Bạn không có quyền chia sẻ file này");
        }

        log.info("Sharing existing file {} to room {}", file.getOriginalFilename(), roomId);

        SendMessageRequest request = new SendMessageRequest();
        request.setRoomId(roomId);
        request.setContent(content != null ? content : "Đã chia sẻ file: " + file.getOriginalFilename());
        request.setFileId(file.getFileId());
        request.setFileName(file.getOriginalFilename());
        request.setFileUrl(file.getFilePath());
        request.setFileSize(file.getFileSize());
        request.setFileType(file.getMimeType());
        request.setMessageType(detectMessageType(file.getMimeType(), file.getOriginalFilename()));

        return messageService.sendMessage(request, senderId);
    }

    // Lấy danh sách file trong phòng chat
    public List<MessDTO> getFilesByRoomId(Long roomId, Long userId) {
        validateRoomAccess(roomId, userId);

        List<Message> messages = messageRepository.findByChatRoom_RoomIdOrderByCreatedAtAsc(roomId);

        return messages.stream()
                .filter(message -> message.getFile() != null)
                .map(messageService::convertToMessageDTO)
                .collect(Collectors.toList());
    }

    // Lấy danh sách hình ảnh trong phòng chat
    public List<MessDTO> getImagesByRoomId(Long roomId, Long userId) {
        validateRoomAccess(roomId, userId);

        List<Message> messages = messageRepository.findByChatRoom_RoomIdOrderByCreatedAtAsc(roomId);

        return messages.stream()
                .filter(message -> message.getMessageType() == Message.MessageType.IMAGE)
                .map(messageService::convertToMessageDTO)
                .collect(Collectors.toList());
    }

    // ============ Private Helper Methods ============

    private void validateFileUpload(MultipartFile file, Long roomId, Long senderId) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File không được để trống");
        }

        chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new EntityNotFoundException("Phòng chat không tồn tại"));

        boolean isMember = chatRoomMemberRepository.existsByChatRoom_RoomIdAndUser_UserId(roomId, senderId);
        if (!isMember) {
            throw new BadRequestException("Bạn không có quyền gửi file trong phòng này");
        }
    }

    private void validateRoomAccess(Long roomId, Long userId) {
        chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new EntityNotFoundException("Phòng chat không tồn tại"));

        boolean isMember = chatRoomMemberRepository.existsByChatRoom_RoomIdAndUser_UserId(roomId, userId);
        if (!isMember) {
            throw new BadRequestException("Bạn không có quyền xem file trong phòng này");
        }
    }

    private boolean isValidImageFormat(String fileName) {
        if (fileName == null)
            return false;
        String extension = fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase();
        return List.of("jpg", "jpeg", "png", "gif", "webp", "bmp").contains(extension);
    }

    private Message.MessageType detectMessageType(String mimeType, String fileName) {
        if (mimeType != null && mimeType.startsWith("image/")) {
            return Message.MessageType.IMAGE;
        }
        if (fileName != null) {
            String ext = fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase();
            if (List.of("jpg", "jpeg", "png", "gif", "webp").contains(ext)) {
                return Message.MessageType.IMAGE;
            }
        }
        return Message.MessageType.FILE;
    }
}
