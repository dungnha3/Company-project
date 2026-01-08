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

// [Controller quản lý hồ sơ cá nhân] (Role: Authenticated User)
@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;
    private final UserMapper userMapper;

    // ==================== READ ====================

    // [Lấy thông tin profile của user hiện tại] (Role: Self)
    @GetMapping
    public ResponseEntity<UserDTO> getCurrentUserProfile() {
        Long userId = getCurrentUserId();
        User user = profileService.getCurrentUserProfile(userId);
        return ResponseEntity.ok(userMapper.toDTO(user));
    }

    // [Lấy thông tin profile - alias endpoint] (Role: Self)
    @GetMapping("/me")
    public ResponseEntity<UserDTO> getMe() {
        Long userId = getCurrentUserId();
        User user = profileService.getCurrentUserProfile(userId);
        return ResponseEntity.ok(userMapper.toDTO(user));
    }

    // ==================== UPDATE ====================

    // [Cập nhật profile của user hiện tại] (Role: Self)
    @PutMapping
    public ResponseEntity<UserDTO> updateProfile(@Valid @RequestBody UpdateUserRequest request) {
        Long userId = getCurrentUserId();
        User user = profileService.updateProfile(userId, request);
        return ResponseEntity.ok(userMapper.toDTO(user));
    }

    // [Cập nhật profile - alias endpoint] (Role: Self)
    @PutMapping("/me")
    public ResponseEntity<UserDTO> updateProfileMe(@Valid @RequestBody UpdateUserRequest request) {
        Long userId = getCurrentUserId();
        User user = profileService.updateProfile(userId, request);
        return ResponseEntity.ok(userMapper.toDTO(user));
    }

    // ==================== PASSWORD ====================

    // [Đổi mật khẩu] (Role: Self)
    @PostMapping("/change-password")
    public ResponseEntity<Map<String, String>> changePassword(
            @Valid @RequestBody DoAn.BE.user.dto.UpdatePasswordRequest request) {
        Long userId = getCurrentUserId();
        profileService.changePassword(userId, request);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Đổi mật khẩu thành công");
        return ResponseEntity.ok(response);
    }

    // ==================== STATUS ====================

    // [Đặt trạng thái online] (Role: Self)
    @PatchMapping("/online")
    public ResponseEntity<Map<String, String>> setOnline() {
        Long userId = getCurrentUserId();
        profileService.setUserOnline(userId);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Đã set online");
        return ResponseEntity.ok(response);
    }

    // [Đặt trạng thái offline] (Role: Self)
    @PatchMapping("/offline")
    public ResponseEntity<Map<String, String>> setOffline() {
        Long userId = getCurrentUserId();
        profileService.setUserOffline(userId);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Đã set offline");
        return ResponseEntity.ok(response);
    }

    // ==================== FCM ====================

    // [Cập nhật FCM token cho push notification] (Role: Self)
    @PutMapping("/fcm-token")
    public ResponseEntity<Map<String, String>> updateFcmToken(@RequestBody Map<String, String> request) {
        Long userId = getCurrentUserId();
        String token = request.get("token");
        profileService.updateFcmToken(userId, token);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Cập nhật FCM token thành công");
        return ResponseEntity.ok(response);
    }

    // ==================== HELPER ====================

    // [Lấy userId từ SecurityContext] (Role: Internal)
    private Long getCurrentUserId() {
        return SecurityUtil.getCurrentUserId();
    }
}
