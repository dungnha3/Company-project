package DoAn.BE.user.controller;

import DoAn.BE.auth.service.SessionService;
import DoAn.BE.auth.service.TwoFactorService;
import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.user.dto.UpdateUserRequest;
import DoAn.BE.user.dto.UserDTO;
import DoAn.BE.user.entity.NotificationSettings;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.mapper.UserMapper;
import DoAn.BE.user.repository.UserRepository;
import DoAn.BE.user.service.ProfileService;
import DoAn.BE.common.util.SecurityUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProfileController {

    private final ProfileService profileService;
    private final UserMapper userMapper;
    private final SessionService sessionService;
    private final UserRepository userRepository;
    private final TwoFactorService twoFactorService;

    @Transactional
    @PutMapping
    public ResponseEntity<UserDTO> updateProfile(@Valid @RequestBody UpdateUserRequest request) {
        Long userId = getCurrentUserId();
        User user = profileService.updateProfile(userId, request);
        return ResponseEntity.ok(userMapper.toDTO(user));
    }

    @Transactional
    @PostMapping("/change-password")
    public ResponseEntity<Map<String, String>> changePassword(
            @Valid @RequestBody DoAn.BE.user.dto.UpdatePasswordRequest request) {
        Long userId = getCurrentUserId();
        profileService.changePassword(userId, request);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Đổi mật khẩu thành công");
        return ResponseEntity.ok(response);
    }

    @Transactional
    @PatchMapping("/online")
    public ResponseEntity<Map<String, String>> setOnline() {
        profileService.setUserOnline(getCurrentUserId());
        return ResponseEntity.ok(Map.of("message", "Đã set online"));
    }

    @Transactional
    @PatchMapping("/offline")
    public ResponseEntity<Map<String, String>> setOffline() {
        profileService.setUserOffline(getCurrentUserId());
        return ResponseEntity.ok(Map.of("message", "Đã set offline"));
    }

    @Transactional
    @PutMapping("/fcm-token")
    public ResponseEntity<Map<String, String>> updateFcmToken(@RequestBody Map<String, String> request) {
        profileService.updateFcmToken(getCurrentUserId(), request.get("token"));
        return ResponseEntity.ok(Map.of("message", "Cập nhật FCM token thành công"));
    }

    // --- Sessions Management ---

    @GetMapping("/sessions")
    public ResponseEntity<List<Map<String, Object>>> getActiveSessions() {
        User user = userRepository.findById(getCurrentUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        List<Map<String, Object>> result = sessionService.getUserActiveSessions(user)
                .stream().map(s -> {
                    Map<String, Object> dto = new HashMap<>();
                    dto.put("id", s.getId());
                    dto.put("sessionId", s.getSessionId());
                    dto.put("device", parseDevice(s.getUserAgent()));
                    dto.put("ipAddress", s.getIpAddress());
                    dto.put("lastActive", s.getLastActivity());
                    dto.put("createdAt", s.getCreatedAt());
                    return dto;
                }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @Transactional
    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<Map<String, String>> revokeSession(@PathVariable String sessionId) {
        sessionService.deactivateSession(sessionId);
        return ResponseEntity.ok(Map.of("message", "Đã đăng xuất phiên"));
    }

    // --- Notification Settings ---

    @GetMapping("/notification-settings")
    public ResponseEntity<NotificationSettings> getNotificationSettings() {
        return ResponseEntity.ok(profileService.getNotificationSettings(getCurrentUserId()));
    }

    @Transactional
    @PutMapping("/notification-settings")
    public ResponseEntity<NotificationSettings> updateNotificationSettings(
            @RequestBody NotificationSettings settings) {
        return ResponseEntity.ok(
                profileService.updateNotificationSettings(getCurrentUserId(), settings));
    }

    // --- Account Management ---

    @Transactional
    @DeleteMapping
    public ResponseEntity<Map<String, String>> deleteAccount(
            @RequestBody Map<String, String> request) {
        String password = request.get("password");
        if (password == null || password.isBlank()) {
            throw new BadRequestException("Vui lòng nhập mật khẩu xác nhận");
        }

        profileService.verifyPasswordAndDeactivate(getCurrentUserId(), password);
        return ResponseEntity.ok(Map.of("message", "Tài khoản đã được xóa"));
    }

    // --- Helpers ---

    // --- Two-Factor Authentication ---

    @PostMapping("/2fa/setup")
    public ResponseEntity<Map<String, String>> setup2fa() {
        Long userId = getCurrentUserId();
        User user = profileService.getCurrentUserProfile(userId);

        if (Boolean.TRUE.equals(user.getTwoFactorEnabled())) {
            throw new BadRequestException("2FA đã được bật");
        }

        String secret = twoFactorService.generateSecret();
        String qrCodeUri = twoFactorService.generateQrCodeUri(secret, user.getUsername());

        // Store secret temporarily (not enabled yet)
        user.setTwoFactorSecret(secret);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "secret", secret,
                "qrCodeUri", qrCodeUri));
    }

    @Transactional
    @PostMapping("/2fa/verify")
    public ResponseEntity<Map<String, Object>> verify2fa(@RequestBody Map<String, String> request) {
        String code = request.get("code");
        if (code == null || code.isBlank()) {
            throw new BadRequestException("Mã xác thực không được để trống");
        }

        Long userId = getCurrentUserId();
        User user = profileService.getCurrentUserProfile(userId);

        if (user.getTwoFactorSecret() == null) {
            throw new BadRequestException("Chưa thiết lập 2FA. Vui lòng gọi setup trước.");
        }

        if (!twoFactorService.verifyCode(user.getTwoFactorSecret(), code)) {
            throw new BadRequestException("Mã xác thực không đúng");
        }

        // Enable 2FA and generate backup codes
        java.util.List<String> backupCodes = twoFactorService.generateBackupCodes();
        user.setTwoFactorEnabled(true);
        user.setTwoFactorBackupCodes(String.join(",", backupCodes));
        userRepository.save(user);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "2FA đã được bật thành công");
        response.put("backupCodes", backupCodes);
        return ResponseEntity.ok(response);
    }

    @Transactional
    @DeleteMapping("/2fa")
    public ResponseEntity<Map<String, String>> disable2fa(@RequestBody Map<String, String> request) {
        String password = request.get("password");
        if (password == null || password.isBlank()) {
            throw new BadRequestException("Vui lòng nhập mật khẩu");
        }

        Long userId = getCurrentUserId();
        // Verify password and disable
        profileService.verifyPasswordAndDisable2fa(userId, password);

        return ResponseEntity.ok(Map.of("message", "2FA đã được tắt"));
    }

    private String parseDevice(String userAgent) {
        if (userAgent == null)
            return "Unknown";
        if (userAgent.contains("iPhone"))
            return "Safari on iPhone";
        if (userAgent.contains("Android"))
            return "Chrome on Android";
        if (userAgent.contains("Mac"))
            return "Safari on Mac";
        if (userAgent.contains("Windows"))
            return "Chrome on Windows";
        if (userAgent.contains("Linux"))
            return "Chrome on Linux";
        return "Browser";
    }

    private Long getCurrentUserId() {
        return SecurityUtil.getCurrentUserId();
    }
}
