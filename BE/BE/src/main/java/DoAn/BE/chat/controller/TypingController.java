package DoAn.BE.chat.controller;

import DoAn.BE.chat.repository.ChatRoomMemberRepository;
import DoAn.BE.chat.service.TypingIndicatorService;
import DoAn.BE.common.exception.UnauthorizedException;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat/rooms")
@CrossOrigin(origins = "*")
public class TypingController {

    @Autowired
    private TypingIndicatorService typingIndicatorService;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private ChatRoomMemberRepository chatRoomMemberRepository;

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
            .orElseThrow(() -> new RuntimeException("User không tồn tại"));
    }

    /**
     * Bắt đầu typing indicator
     */
    @PostMapping("/{roomId}/typing/start")
    public ResponseEntity<Map<String, String>> startTyping(@PathVariable Long roomId) {
        if (roomId == null) {
            throw new IllegalArgumentException("Room ID không được null");
        }
        User currentUser = getCurrentUser();
        if (currentUser.getUserId() == null) {
            throw new IllegalStateException("User ID không hợp lệ");
        }
        typingIndicatorService.startTyping(roomId, currentUser.getUserId());
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Started typing");
        return ResponseEntity.ok(response);
    }

    /**
     * Dừng typing indicator
     */
    @PostMapping("/{roomId}/typing/stop")
    public ResponseEntity<Map<String, String>> stopTyping(@PathVariable Long roomId) {
        if (roomId == null) {
            throw new IllegalArgumentException("Room ID không được null");
        }
        User currentUser = getCurrentUser();
        if (currentUser.getUserId() == null) {
            throw new IllegalStateException("User ID không hợp lệ");
        }
        typingIndicatorService.stopTyping(roomId, currentUser.getUserId());
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Stopped typing");
        return ResponseEntity.ok(response);
    }

    /**
     * Lấy danh sách user đang typing
     */
    @GetMapping("/{roomId}/typing")
    public ResponseEntity<Map<String, Object>> getTypingUsers(@PathVariable Long roomId) {
        if (roomId == null) {
            throw new IllegalArgumentException("Room ID không được null");
        }
        User currentUser = getCurrentUser();
        if (currentUser.getUserId() == null) {
            throw new IllegalStateException("User ID không hợp lệ");
        }
        
        // Validate user có trong phòng không
        boolean isMember = chatRoomMemberRepository.existsByChatRoom_RoomIdAndUser_UserId(roomId, currentUser.getUserId());
        if (!isMember) {
            throw new UnauthorizedException("Bạn không có quyền xem thông tin phòng chat này");
        }
        
        List<String> typingUsers = typingIndicatorService.getTypingUsers(roomId);
        int typingCount = typingIndicatorService.getTypingUserCount(roomId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("typingUsers", typingUsers);
        response.put("typingCount", typingCount);
        response.put("isCurrentUserTyping", typingIndicatorService.isUserTyping(roomId, currentUser.getUserId()));
        
        return ResponseEntity.ok(response);
    }
}

