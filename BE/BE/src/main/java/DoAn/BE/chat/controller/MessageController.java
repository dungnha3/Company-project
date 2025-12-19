package DoAn.BE.chat.controller;

import DoAn.BE.chat.dto.MessDTO;
import DoAn.BE.chat.dto.SendMessageRequest;
import DoAn.BE.chat.entity.Message;
import DoAn.BE.chat.service.MessageService;
import DoAn.BE.common.exception.EntityNotFoundException;
import DoAn.BE.common.exception.UnauthorizedException;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "*")
public class MessageController {

    @Autowired
    private MessageService messageService;
    
    @Autowired
    private UserRepository userRepository;

    // Lấy thông tin user hiện tại từ Security Context
    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UnauthorizedException("User chưa đăng nhập");
        }
        
        // Get User from principal (set by JwtAuthenticationFilter)
        Object principal = authentication.getPrincipal();
        if (principal instanceof User) {
            return (User) principal;
        }
        
        // Fallback: try to find by username
        String username = authentication.getName();
        return userRepository.findByUsername(username)
            .orElseThrow(() -> new EntityNotFoundException("User không tồn tại"));
    }

    // Gửi tin nhắn text
    @PostMapping("/rooms/{roomId}/messages")
    public ResponseEntity<MessDTO> sendMessage(
            @PathVariable Long roomId,
            @Valid @RequestBody SendMessageRequest request) {
        if (roomId == null) {
            throw new IllegalArgumentException("Room ID không được null");
        }
        User currentUser = getCurrentUser();
        if (currentUser.getUserId() == null) {
            throw new IllegalStateException("User ID không hợp lệ");
        }
        request.setRoomId(roomId);
        MessDTO message = messageService.sendMessage(request, currentUser.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(message);
    }

    // Lấy danh sách tin nhắn trong phòng chat (có phân trang)
    @GetMapping("/rooms/{roomId}/messages")
    public ResponseEntity<Page<MessDTO>> getMessages(
            @PathVariable Long roomId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        if (roomId == null) {
            throw new IllegalArgumentException("Room ID không được null");
        }
        User currentUser = getCurrentUser();
        if (currentUser.getUserId() == null) {
            throw new IllegalStateException("User ID không hợp lệ");
        }
        Pageable pageable = PageRequest.of(page, size);
        List<MessDTO> messages = messageService.getMessagesByRoomId(roomId, currentUser.getUserId(), page, size);
        // Convert to Page manually for now
        Page<MessDTO> pageMessages = new PageImpl<>(messages, pageable, messages.size());
        return ResponseEntity.ok(pageMessages);
    }

    // Đánh dấu tin nhắn đã xem
    @PutMapping("/messages/{messageId}/seen")
    public ResponseEntity<Map<String, String>> markMessageAsSeen(@PathVariable Long messageId) {
        if (messageId == null) {
            throw new IllegalArgumentException("Message ID không được null");
        }
        User currentUser = getCurrentUser();
        if (currentUser.getUserId() == null) {
            throw new IllegalStateException("User ID không hợp lệ");
        }
        messageService.markMessageAsSeen(messageId, currentUser.getUserId());
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Đã đánh dấu tin nhắn đã xem");
        return ResponseEntity.ok(response);
    }

    // Sửa tin nhắn
    @PutMapping("/messages/{messageId}")
    public ResponseEntity<MessDTO> editMessage(
            @PathVariable Long messageId,
            @RequestBody Map<String, String> request) {
        if (messageId == null) {
            throw new IllegalArgumentException("Message ID không được null");
        }
        User currentUser = getCurrentUser();
        if (currentUser.getUserId() == null) {
            throw new IllegalStateException("User ID không hợp lệ");
        }
        String newContent = request.get("content");
        MessDTO message = messageService.editMessage(messageId, newContent, currentUser.getUserId());
        return ResponseEntity.ok(message);
    }

    // Xóa tin nhắn
    @DeleteMapping("/messages/{messageId}")
    public ResponseEntity<Map<String, String>> deleteMessage(@PathVariable Long messageId) {
        if (messageId == null) {
            throw new IllegalArgumentException("Message ID không được null");
        }
        User currentUser = getCurrentUser();
        if (currentUser.getUserId() == null) {
            throw new IllegalStateException("User ID không hợp lệ");
        }
        messageService.deleteMessage(messageId, currentUser.getUserId());
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Tin nhắn đã được xóa");
        return ResponseEntity.ok(response);
    }

    // Tìm kiếm tin nhắn trong phòng chat
    @GetMapping("/rooms/{roomId}/search")
    public ResponseEntity<List<MessDTO>> searchMessages(
            @PathVariable Long roomId,
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        User currentUser = getCurrentUser();
        Pageable pageable = PageRequest.of(page, size);
        List<MessDTO> messages = messageService.searchMessages(roomId, keyword, currentUser.getUserId(), pageable);
        return ResponseEntity.ok(messages);
    }

    // Tìm kiếm tin nhắn theo người gửi
    @GetMapping("/rooms/{roomId}/search/sender")
    public ResponseEntity<List<MessDTO>> searchMessagesBySender(
            @PathVariable Long roomId,
            @RequestParam String senderKeyword) {
        User currentUser = getCurrentUser();
        List<MessDTO> messages = messageService.searchMessagesBySender(roomId, senderKeyword, currentUser.getUserId());
        return ResponseEntity.ok(messages);
    }

    // Tìm kiếm tin nhắn theo khoảng thời gian
    @GetMapping("/rooms/{roomId}/search/date")
    public ResponseEntity<List<MessDTO>> searchMessagesByDateRange(
            @PathVariable Long roomId,
            @RequestParam String startDate,
            @RequestParam String endDate) {
        User currentUser = getCurrentUser();
        LocalDateTime start = LocalDateTime.parse(startDate);
        LocalDateTime end = LocalDateTime.parse(endDate);
        List<MessDTO> messages = messageService.searchMessagesByDateRange(roomId, start, end, currentUser.getUserId());
        return ResponseEntity.ok(messages);
    }

    // Tìm kiếm tin nhắn theo loại
    @GetMapping("/rooms/{roomId}/search/type")
    public ResponseEntity<List<MessDTO>> searchMessagesByType(
            @PathVariable Long roomId,
            @RequestParam Message.MessageType messageType) {
        User currentUser = getCurrentUser();
        List<MessDTO> messages = messageService.searchMessagesByType(roomId, messageType, currentUser.getUserId());
        return ResponseEntity.ok(messages);
    }
}

