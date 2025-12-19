package DoAn.BE.chat.controller;

import DoAn.BE.chat.dto.MessDTO;
import DoAn.BE.chat.service.FileService;
import DoAn.BE.common.exception.EntityNotFoundException;
import DoAn.BE.common.exception.UnauthorizedException;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/chat/rooms")
@CrossOrigin(origins = "*")
public class FileController {

    @Autowired
    private FileService fileService;
    
    @Autowired
    private UserRepository userRepository;

    /**
     * Lấy thông tin user hiện tại từ Security Context
     */
    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UnauthorizedException("User chưa đăng nhập");
        }
        
        String username = authentication.getName();
        return userRepository.findByUsername(username)
            .orElseThrow(() -> new EntityNotFoundException("User không tồn tại"));
    }

    /**
     * Upload và gửi file
     */
    @PostMapping(value = "/{roomId}/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<MessDTO> uploadAndSendFile(
            @PathVariable Long roomId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "content", required = false) String content) {
        User currentUser = getCurrentUser();
        MessDTO message = fileService.uploadAndSendFile(file, roomId, content, currentUser.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(message);
    }

    /**
     * Upload và gửi hình ảnh
     */
    @PostMapping(value = "/{roomId}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<MessDTO> uploadAndSendImage(
            @PathVariable Long roomId,
            @RequestParam("image") MultipartFile image,
            @RequestParam(value = "content", required = false) String content) {
        User currentUser = getCurrentUser();
        MessDTO message = fileService.uploadAndSendImage(image, roomId, content, currentUser.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(message);
    }

    /**
     * Lấy danh sách file trong phòng chat
     */
    @GetMapping("/{roomId}/files")
    public ResponseEntity<List<MessDTO>> getFiles(@PathVariable Long roomId) {
        User currentUser = getCurrentUser();
        List<MessDTO> files = fileService.getFilesByRoomId(roomId, currentUser.getUserId());
        return ResponseEntity.ok(files);
    }

    /**
     * Lấy danh sách hình ảnh trong phòng chat
     */
    @GetMapping("/{roomId}/images")
    public ResponseEntity<List<MessDTO>> getImages(@PathVariable Long roomId) {
        User currentUser = getCurrentUser();
        List<MessDTO> images = fileService.getImagesByRoomId(roomId, currentUser.getUserId());
        return ResponseEntity.ok(images);
    }
}

