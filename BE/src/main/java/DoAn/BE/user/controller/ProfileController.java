package DoAn.BE.user.controller;

import DoAn.BE.user.dto.UpdateUserRequest;
import DoAn.BE.user.dto.UserDTO;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.mapper.UserMapper;
import DoAn.BE.user.service.ProfileService;
import DoAn.BE.common.util.SecurityUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;
    private final UserMapper userMapper;
    @PutMapping
    public ResponseEntity<UserDTO> updateProfile(@Valid @RequestBody UpdateUserRequest request) {
        Long userId = getCurrentUserId();
        User user = profileService.updateProfile(userId, request);
        return ResponseEntity.ok(userMapper.toDTO(user));
    }
    @PostMapping("/change-password")
    public ResponseEntity<Map<String, String>> changePassword(
            @Valid @RequestBody DoAn.BE.user.dto.UpdatePasswordRequest request) {
        Long userId = getCurrentUserId();
        profileService.changePassword(userId, request);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Đổi mật khẩu thành công");
        return ResponseEntity.ok(response);
    }
    @PatchMapping("/online")
    public ResponseEntity<Map<String, String>> setOnline() {
        Long userId = getCurrentUserId();
        profileService.setUserOnline(userId);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Đã set online");
        return ResponseEntity.ok(response);
    }
    @PatchMapping("/offline")
    public ResponseEntity<Map<String, String>> setOffline() {
        Long userId = getCurrentUserId();
        profileService.setUserOffline(userId);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Đã set offline");
        return ResponseEntity.ok(response);
    }
    @PutMapping("/fcm-token")
    public ResponseEntity<Map<String, String>> updateFcmToken(@RequestBody Map<String, String> request) {
        Long userId = getCurrentUserId();
        String token = request.get("token");
        profileService.updateFcmToken(userId, token);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Cập nhật FCM token thành công");
        return ResponseEntity.ok(response);
    }
    private Long getCurrentUserId() {
        return SecurityUtil.getCurrentUserId();
    }
}
