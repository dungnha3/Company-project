package DoAn.BE.sysadmin.controller;

import DoAn.BE.sysadmin.dto.SysAdminUserDto;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sysadmin/users")
@RequiredArgsConstructor
public class SysAdminUserController {

    private final UserRepository userRepository;

    /**
     * [LIST] List all users with pagination
     */
    @GetMapping
    public ResponseEntity<Page<SysAdminUserDto.UserResponse>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String keyword,
            Authentication authentication) {
        checkSysAdmin(authentication);

        Pageable pageable = PageRequest.of(page, size);

        // Get all non-deleted users with optional filtering
        List<User> allUsers = userRepository.findAll().stream()
                .filter(u -> !Boolean.TRUE.equals(u.getIsDeleted()))
                .filter(u -> {
                    if (keyword == null || keyword.isBlank())
                        return true;
                    String lowerKeyword = keyword.toLowerCase();
                    return (u.getUsername() != null && u.getUsername().toLowerCase().contains(lowerKeyword)) ||
                            (u.getEmail() != null && u.getEmail().toLowerCase().contains(lowerKeyword));
                })
                .toList();

        // Manual pagination
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), allUsers.size());

        List<SysAdminUserDto.UserResponse> pagedContent = allUsers.subList(
                Math.min(start, allUsers.size()),
                end).stream().map(this::toUserResponse).toList();

        Page<SysAdminUserDto.UserResponse> result = new PageImpl<>(pagedContent, pageable, allUsers.size());
        return ResponseEntity.ok(result);
    }

    /**
     * [ACTION] Toggle user status (Active/Suspend)
     */
    @PutMapping("/{userId}/toggle-status")
    public ResponseEntity<?> toggleUserStatus(
            @PathVariable Long userId,
            Authentication authentication) {
        checkSysAdmin(authentication);

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

    /**
     * [ACTION] Reset user password (send email)
     */
    @PostMapping("/{userId}/reset-password")
    public ResponseEntity<?> resetUserPassword(
            @PathVariable Long userId,
            Authentication authentication) {
        checkSysAdmin(authentication);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new DoAn.BE.common.exception.ResourceNotFoundException("User not found"));

        // Generate random password (8 chars)
        String newPassword = java.util.UUID.randomUUID().toString().substring(0, 8);
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Send email
        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            emailService.sendPasswordResetEmail(user.getEmail(), user.getUsername(), newPassword);
        } else {
            return ResponseEntity.ok(Map.of(
                    "message", "Password reset to: " + newPassword + " (User has no email)",
                    "newPassword", newPassword // Return in response if email missing (fallback)
            ));
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

    private void checkSysAdmin(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        if (!user.isSystemAdminAccount()) {
            throw new DoAn.BE.common.exception.ForbiddenException("Access Denied: System Admin only");
        }
    }
}
