package DoAn.BE.chat.controller;

import DoAn.BE.common.annotation.FeatureFlag;

import DoAn.BE.chat.dto.MessDTO;
import DoAn.BE.chat.service.ChatFileService;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat/rooms")
@RequiredArgsConstructor
@FeatureFlag("CHAT")
public class FileController {

    private final ChatFileService chatFileService;

    // Upload và gửi file
    @PostMapping(value = "/{roomId}/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<MessDTO> uploadAndSendFile(
            @PathVariable Long roomId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "content", required = false) String content,
            @AuthenticationPrincipal User currentUser) {
        MessDTO message = chatFileService.uploadAndSendFile(file, roomId, content, currentUser.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(message);
    }

    // Upload và gửi hình ảnh
    @PostMapping(value = "/{roomId}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<MessDTO> uploadAndSendImage(
            @PathVariable Long roomId,
            @RequestParam("image") MultipartFile image,
            @RequestParam(value = "content", required = false) String content,
            @AuthenticationPrincipal User currentUser) {
        MessDTO message = chatFileService.uploadAndSendImage(image, roomId, content, currentUser.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(message);
    }

    @GetMapping("/{roomId}/files")
    public ResponseEntity<List<MessDTO>> getFiles(
            @PathVariable Long roomId,
            @AuthenticationPrincipal User currentUser) {
        List<MessDTO> files = chatFileService.getFilesByRoomId(roomId, currentUser.getUserId());
        return ResponseEntity.ok(files);
    }

    @GetMapping("/{roomId}/images")
    public ResponseEntity<List<MessDTO>> getImages(
            @PathVariable Long roomId,
            @AuthenticationPrincipal User currentUser) {
        List<MessDTO> images = chatFileService.getImagesByRoomId(roomId, currentUser.getUserId());
        return ResponseEntity.ok(images);
    }

    // Chia sẻ file đã tồn tại từ Storage vào chat
    @PostMapping("/{roomId}/files/share/{fileId}")
    public ResponseEntity<MessDTO> shareExistingFile(
            @PathVariable Long roomId,
            @PathVariable Long fileId,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal User currentUser) {
        String content = body != null ? body.get("content") : null;
        MessDTO message = chatFileService.sendExistingFile(fileId, roomId, content, currentUser.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(message);
    }
}