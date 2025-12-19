package DoAn.BE.chat.controller;

import DoAn.BE.chat.service.MessageStatusService;
import DoAn.BE.common.exception.EntityNotFoundException;
import DoAn.BE.common.exception.UnauthorizedException;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "*")
public class MessageStatusController {

    @Autowired
    private MessageStatusService messageStatusService;
    
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
     * Lấy số tin nhắn chưa đọc
     */
    @GetMapping("/rooms/{roomId}/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@PathVariable Long roomId) {
        if (roomId == null) {
            throw new IllegalArgumentException("Room ID không được null");
        }
        User currentUser = getCurrentUser();
        if (currentUser.getUserId() == null) {
            throw new IllegalStateException("User ID không hợp lệ");
        }
        Long unreadCount = messageStatusService.getUnreadCount(roomId, currentUser.getUserId());
        
        Map<String, Long> response = new HashMap<>();
        response.put("unreadCount", unreadCount);
        return ResponseEntity.ok(response);
    }
}

