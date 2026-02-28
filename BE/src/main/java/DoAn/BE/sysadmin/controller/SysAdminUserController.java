package DoAn.BE.sysadmin.controller;

import DoAn.BE.sysadmin.dto.SysAdminUserDto;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/sysadmin/users")
@RequiredArgsConstructor
@Slf4j
public class SysAdminUserController {

    private final UserRepository userRepository;

    // [LIST] List all users with pagination
    // /
    @GetMapping
    public ResponseEntity<Page<SysAdminUserDto.UserResponse>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String keyword,
            @AuthenticationPrincipal User currentUser) {
        checkSysAdmin(currentUser);

        Pageable pageable = PageRequest.of(page, size);

        // DB-level filtering and pagination to avoid loading all users into memory
        Page<User> userPage;
        if (keyword != null && !keyword.isBlank()) {
            userPage = userRepository.searchByKeywordPaged(keyword, pageable);
        } else {
            userPage = userRepository.findByIsDeletedFalse(pageable);
        }

        Page<SysAdminUserDto.UserResponse> result = userPage.map(this::toUserResponse);
        return ResponseEntity.ok(result);
    }

    // [ACTION] Toggle user status (Active/Suspend)
    // /
    @PutMapping("/{userId}/toggle-status")
    public ResponseEntity<?> toggleUserStatus(
            @PathVariable Long userId,
            @AuthenticationPrincipal User currentUser) {
        checkSysAdmin(currentUser);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new DoAn.BE.common.exception.ResourceNotFoundException("User not found"));

        // Prevent deactivating sysadmin
        if (user.isSystemAdminAccount()) {
            throw new DoAn.BE.common.exception.ForbiddenException("Cannot modify system admin account");
        }

        user.setIsActive(!user.getIsActive());
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "message", user.getIsActive() ? "User activated" : "User suspended",
                "isActive", user.getIsActive()));
    }

    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final DoAn.BE.notification.service.EmailNotificationService emailService;

    // ... (existing code)

    // [ACTION] Reset user password (send email)
    // /
    @PostMapping("/{userId}/reset-password")
    public ResponseEntity<?> resetUserPassword(
            @PathVariable Long userId,
            @AuthenticationPrincipal User currentUser) {
        checkSysAdmin(currentUser);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new DoAn.BE.common.exception.ResourceNotFoundException("User not found"));
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
        java.security.SecureRandom random = new java.security.SecureRandom();
        StringBuilder sb = new StringBuilder(12);
        for (int i = 0; i < 12; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        String newPassword = sb.toString();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Send email
        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            // TODO: Replace with password reset link flow
            log.warn("[SECURITY] Plain password sent via email for user {}. Implement reset-link flow.",
                    user.getUsername());
            emailService.sendPasswordResetEmail(user.getEmail(), user.getUsername(), newPassword);
        } else {
            // Log the event but NEVER return password in response
            return ResponseEntity.ok(Map.of(
                    "message", "Password reset thành công. User không có email nên không thể gửi mail thông báo."));
        }

        return ResponseEntity.ok(Map.of("message", "Password reset email sent to " + user.getEmail()));
    }

    private SysAdminUserDto.UserResponse toUserResponse(User user) {
        return SysAdminUserDto.UserResponse.builder()
                .userId(user.getUserId())
                .username(user.getUsername())
                .email(user.getEmail())
                .isActive(user.getIsActive())
                .isSystemAdminAccount(user.isSystemAdminAccount())
                .lastLoginAt(user.getLastLogin())
                .createdAt(user.getCreatedAt())
                .build();
    }

    private void checkSysAdmin(User user) {
        if (user == null || !user.isSystemAdminAccount()) {
            throw new DoAn.BE.common.exception.ForbiddenException("Access Denied: System Admin only");
        }
    }
}
