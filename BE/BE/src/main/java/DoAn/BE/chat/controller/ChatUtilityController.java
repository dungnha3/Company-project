package DoAn.BE.chat.controller;

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
public class ChatUtilityController {

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
     * Lấy thông tin user hiện tại
     */
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getCurrentUserInfo() {
        User currentUser = getCurrentUser();

        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("userId", currentUser.getUserId());
        userInfo.put("username", currentUser.getUsername());
        userInfo.put("email", currentUser.getEmail());
        userInfo.put("avatarUrl", currentUser.getAvatarUrl());
        userInfo.put("isOnline", currentUser.getIsOnline());

        return ResponseEntity.ok(userInfo);
    }

    /**
     * Health check endpoint
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "OK");
        response.put("service", "Chat Service");
        response.put("timestamp", java.time.LocalDateTime.now().toString());
        return ResponseEntity.ok(response);
    }
}
