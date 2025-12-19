package DoAn.BE.user.controller;

import DoAn.BE.user.dto.ChangePasswordRequest;
import DoAn.BE.user.dto.UpdateUserRequest;
import DoAn.BE.user.dto.UserDTO;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.mapper.UserMapper;
import DoAn.BE.user.service.ProfileService;
import DoAn.BE.common.util.SecurityUtil;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final ProfileService profileService;
    private final UserMapper userMapper;

    public ProfileController(ProfileService profileService, UserMapper userMapper) {
        this.profileService = profileService;
        this.userMapper = userMapper;
    }

    /**
     * Lấy thông tin profile của user hiện tại
     * GET /api/profile
     */
    @GetMapping
    public ResponseEntity<UserDTO> getCurrentUserProfile() {
        Long userId = getCurrentUserId();
        User user = profileService.getCurrentUserProfile(userId);
        return ResponseEntity.ok(userMapper.toDTO(user));
    }

    /**
     * Lấy thông tin profile của user hiện tại (alias)
     * GET /api/profile/me
     */
    @GetMapping("/me")
    public ResponseEntity<UserDTO> getMe() {
        Long userId = getCurrentUserId();
        User user = profileService.getCurrentUserProfile(userId);
        return ResponseEntity.ok(userMapper.toDTO(user));
    }

    /**
     * Cập nhật profile của user hiện tại
     * PUT /api/profile
     */
    @PutMapping
    public ResponseEntity<UserDTO> updateProfile(@Valid @RequestBody UpdateUserRequest request) {
        Long userId = getCurrentUserId();
        User user = profileService.updateProfile(userId, request);
        return ResponseEntity.ok(userMapper.toDTO(user));
    }

    /**
     * Cập nhật profile của user hiện tại (alias for /me endpoint)
     * PUT /api/profile/me
     */
    @PutMapping("/me")
    public ResponseEntity<UserDTO> updateProfileMe(@Valid @RequestBody UpdateUserRequest request) {
        Long userId = getCurrentUserId();
        User user = profileService.updateProfile(userId, request);
        return ResponseEntity.ok(userMapper.toDTO(user));
    }

    /**
     * Đổi mật khẩu
     * POST /api/profile/change-password
     */
    @PostMapping("/change-password")
    public ResponseEntity<Map<String, String>> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        Long userId = getCurrentUserId();
        profileService.changePassword(userId, request);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Đổi mật khẩu thành công");
        return ResponseEntity.ok(response);
    }

    /**
     * Set user online
     * PATCH /api/profile/online
     */
    @PatchMapping("/online")
    public ResponseEntity<Map<String, String>> setOnline() {
        Long userId = getCurrentUserId();
        profileService.setUserOnline(userId);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Đã set online");
        return ResponseEntity.ok(response);
    }

    /**
     * Set user offline
     * PATCH /api/profile/offline
     */
    @PatchMapping("/offline")
    public ResponseEntity<Map<String, String>> setOffline() {
        Long userId = getCurrentUserId();
        profileService.setUserOffline(userId);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Đã set offline");
        return ResponseEntity.ok(response);
    }

    /**
     * Update FCM token
     * PUT /api/profile/fcm-token
     */
    @PutMapping("/fcm-token")
    public ResponseEntity<Map<String, String>> updateFcmToken(@RequestBody Map<String, String> request) {
        Long userId = getCurrentUserId();
        String token = request.get("token");
        profileService.updateFcmToken(userId, token);

        Map<String, String> response = new HashMap<>();
        response.put("message", "FCM token updated successfully");
        return ResponseEntity.ok(response);
    }

    /**
     * Helper method để lấy userId từ SecurityContext
     */
    private Long getCurrentUserId() {
        return SecurityUtil.getCurrentUserId();
    }
}
