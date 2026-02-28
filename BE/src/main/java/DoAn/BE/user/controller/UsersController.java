package DoAn.BE.user.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.user.dto.UserDTO;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.mapper.UserMapper;
import DoAn.BE.user.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// Đây là alias controller cho frontend gọi /api/users thay vì /api/accounts
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Slf4j
public class UsersController {

    private final UserService userService;
    private final UserMapper userMapper;
    private final AccessControlService accessControlService;
    private final DoAn.BE.auth.service.AuthService authService;
    private final DoAn.BE.company.repository.CompanyMemberRepository companyMemberRepository;
    private final DoAn.BE.company.repository.CompanyRepository companyRepository;
    private final DoAn.BE.company.service.RoleTemplateService roleTemplateService;
    private final DoAn.BE.audit.service.AuditLogService auditLogService;
    private final DoAn.BE.company.service.SubscriptionService subscriptionService;

    @PostMapping
    public ResponseEntity<?> createUser(
            @RequestBody DoAn.BE.auth.dto.RegisterRequest request,
            @AuthenticationPrincipal User currentUser,
            jakarta.servlet.http.HttpServletRequest httpRequest) {

        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        if (!accessControlService.isOwnerOrAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // [SAAS] Kiểm tra giới hạn user của gói cước
        Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();
        if (companyId != null) {
            try {
                subscriptionService.checkUserLimit(companyId);
            } catch (DoAn.BE.common.exception.BadRequestException e) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(java.util.Map.of("message", e.getMessage()));
            }
        }

        try {
            String ipAddress = httpRequest.getRemoteAddr();
            String userAgent = httpRequest.getHeader("User-Agent");
            DoAn.BE.auth.dto.AuthResponse response = authService.register(request, ipAddress, userAgent);

            User newUser = null;
            if (companyId != null) {
                newUser = userService.findByEmail(request.getEmail())
                        .orElseThrow(() -> new DoAn.BE.common.exception.ResourceNotFoundException(
                                "User not found after creation"));
                DoAn.BE.company.entity.Company company = companyRepository.findById(companyId)
                        .orElseThrow(() -> new DoAn.BE.common.exception.ResourceNotFoundException("Company not found"));

                DoAn.BE.company.entity.CompanyMember member = new DoAn.BE.company.entity.CompanyMember();
                member.setUser(newUser);
                member.setCompany(company);
                member.getRoles().add(DoAn.BE.company.entity.CompanyRole.EMPLOYEE);
                member.setPermissions(
                        roleTemplateService.getTemplate(java.util.Set.of(DoAn.BE.company.entity.CompanyRole.EMPLOYEE)));
                member.setInvitedAt(java.time.LocalDateTime.now());
                member.setIsActive(true);
                companyMemberRepository.save(member);

                log.info("Đã thêm user {} vào công ty {} với role EMPLOYEE",
                        newUser.getUsername(), company.getName());
            }

            if (newUser != null) {
                auditLogService.logAction(
                        currentUser.getUserId(),
                        "CREATE_USER",
                        "USER",
                        newUser.getUserId(),
                        null,
                        java.util.Map.of(
                                "username", newUser.getUsername(),
                                "email", newUser.getEmail(),
                                "role", "EMPLOYEE"),
                        DoAn.BE.audit.entity.AuditLog.Severity.INFO,
                        ipAddress,
                        userAgent);
            }

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            log.error("Failed to create user: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(java.util.Map.of("message", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<List<UserDTO>> getAllUsers(
            @AuthenticationPrincipal User currentUser) {

        log.debug("=== GET /api/users ===");
        log.debug("currentUser: {}", currentUser != null ? currentUser.getUsername() : "NULL");

        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // System Admin có thể xem tất cả
        if (currentUser.isSystemAdminAccount()) {
            List<User> users = userService.getAllUsers();
            return ResponseEntity.ok(userMapper.toDTOList(users));
        }

        // Company users with hrViewList permission can view all
        try {
            accessControlService.checkHrViewPermission();
            List<User> users = userService.getUsersByCurrentCompanyWithoutPaging();
            return ResponseEntity.ok(userMapper.toDTOList(users));
        } catch (ForbiddenException ignored) {
            // no permission
        }

        log.warn("User {} không có quyền truy cập /api/users", currentUser.getUsername());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }

    @GetMapping("/{userId}")
    public ResponseEntity<UserDTO> getUserById(
            @PathVariable Long userId,
            @AuthenticationPrincipal User currentUser) {

        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // Permission check: users with hrViewList can view any user, otherwise only
        // self
        boolean hasViewPermission;
        try {
            accessControlService.checkHrViewPermission();
            hasViewPermission = true;
        } catch (ForbiddenException e) {
            hasViewPermission = false;
        }
        if (!hasViewPermission && !currentUser.getUserId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        User user = userService.getUserById(userId);
        return ResponseEntity.ok(userMapper.toDTO(user));
    }

    @GetMapping("/search")
    public ResponseEntity<List<UserDTO>> searchUsers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String query,
            @AuthenticationPrincipal User currentUser) {

        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // Support both 'keyword' and 'query' params for flexibility
        String searchTerm = keyword != null ? keyword : query;
        if (searchTerm == null || searchTerm.trim().isEmpty()) {
            return ResponseEntity.ok(List.of());
        }

        List<User> users = userService.searchUsers(searchTerm);
        return ResponseEntity.ok(userMapper.toDTOList(users));
    }

    @GetMapping("/active")
    public ResponseEntity<List<UserDTO>> getActiveUsers(@AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        List<User> users = userService.getActiveUsers();
        return ResponseEntity.ok(userMapper.toDTOList(users));
    }

    @GetMapping("/online")
    public ResponseEntity<List<UserDTO>> getOnlineUsers(@AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            accessControlService.checkHrViewPermission();
        } catch (ForbiddenException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        List<User> users = userService.getOnlineUsers();
        return ResponseEntity.ok(userMapper.toDTOList(users));
    }

    @PutMapping("/{userId}")
    public ResponseEntity<UserDTO> updateUser(
            @PathVariable Long userId,
            @RequestBody UserDTO userDTO,
            @AuthenticationPrincipal User currentUser) {

        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // Kiểm tra quyền: Admin/HR cập nhật tất cả, user cập nhật của mình, System
        // Admin cập nhật tất cả
        boolean hasEditPermission;
        try {
            accessControlService.checkHrEditPermission();
            hasEditPermission = true;
        } catch (ForbiddenException e) {
            hasEditPermission = false;
        }
        if (!currentUser.isSystemAdminAccount() &&
                !hasEditPermission &&
                !currentUser.getUserId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        User updatedUser = userService.updateUser(userId, userDTO, currentUser);
        return ResponseEntity.ok(userMapper.toDTO(updatedUser));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<java.util.Map<String, String>> deleteUser(
            @PathVariable Long userId,
            @AuthenticationPrincipal User currentUser) {

        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // System Admin allowed
        if (!currentUser.isSystemAdminAccount() && !accessControlService.isOwnerOrAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        userService.deleteUser(userId, currentUser);

        java.util.Map<String, String> response = new java.util.HashMap<>();
        response.put("message", "Xóa user thành công");
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{userId}/activate")
    public ResponseEntity<UserDTO> activateUser(
            @PathVariable Long userId,
            @AuthenticationPrincipal User currentUser) {

        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        boolean hasEditPermission;
        try {
            accessControlService.checkHrEditPermission();
            hasEditPermission = true;
        } catch (ForbiddenException e) {
            hasEditPermission = false;
        }
        if (!currentUser.isSystemAdminAccount() && !hasEditPermission) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        User user = userService.activateUser(userId);

        // Log audit action
        auditLogService.logAction(
                currentUser.getUserId(),
                "ACTIVATE_USER",
                "USER",
                userId,
                java.util.Map.of("isActive", false),
                java.util.Map.of("isActive", true, "username", user.getUsername()),
                DoAn.BE.audit.entity.AuditLog.Severity.WARNING,
                null,
                null);

        return ResponseEntity.ok(userMapper.toDTO(user));
    }

    @PatchMapping("/{userId}/deactivate")
    public ResponseEntity<UserDTO> deactivateUser(
            @PathVariable Long userId,
            @AuthenticationPrincipal User currentUser) {

        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        boolean hasEditPermission;
        try {
            accessControlService.checkHrEditPermission();
            hasEditPermission = true;
        } catch (ForbiddenException e) {
            hasEditPermission = false;
        }
        if (!currentUser.isSystemAdminAccount() && !hasEditPermission) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        User user = userService.deactivateUser(userId);

        // Log audit action
        auditLogService.logAction(
                currentUser.getUserId(),
                "DEACTIVATE_USER",
                "USER",
                userId,
                java.util.Map.of("isActive", true),
                java.util.Map.of("isActive", false, "username", user.getUsername()),
                DoAn.BE.audit.entity.AuditLog.Severity.CRITICAL,
                null,
                null);

        return ResponseEntity.ok(userMapper.toDTO(user));
    }
}
