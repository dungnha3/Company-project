package DoAn.BE.chat.controller;

import DoAn.BE.common.annotation.FeatureFlag;

import DoAn.BE.user.entity.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@FeatureFlag("CHAT")
@Transactional(readOnly = true)
public class ChatUtilityController {
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getCurrentUserInfo(@AuthenticationPrincipal User currentUser) {
        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("userId", currentUser.getUserId());
        userInfo.put("username", currentUser.getUsername());
        userInfo.put("email", currentUser.getEmail());
        userInfo.put("avatarUrl", currentUser.getAvatarUrl());
        userInfo.put("isOnline", currentUser.getIsOnline());

        return ResponseEntity.ok(userInfo);
    }
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "OK");
        response.put("service", "Chat Service");
        response.put("timestamp", java.time.LocalDateTime.now().toString());
        return ResponseEntity.ok(response);
    }
}