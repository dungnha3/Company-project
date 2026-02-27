package DoAn.BE.user.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.company.entity.CompanyRole;
import DoAn.BE.user.dto.UpdatePasswordRequest;
import DoAn.BE.user.dto.UserDTO;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.mapper.UserMapper;
import DoAn.BE.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
@RestController
@RequestMapping("/api/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final UserService userService;
    private final UserMapper userMapper;
    private final AccessControlService accessControlService;

    @GetMapping
    public ResponseEntity<Page<UserDTO>> getAllAccounts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "userId") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(required = false) Long companyId,
            @AuthenticationPrincipal User currentUser) {

        Sort sort = sortDir.equalsIgnoreCase("desc") ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);

        if (currentUser != null && currentUser.isSystemAdminAccount()) {
            Page<User> users;
            if (companyId != null) {
                users = userService.getUsersByCompanyId(companyId, pageable);
            } else {
                users = userService.getAllUsers(pageable);
            }
            return ResponseEntity.ok(users.map(userMapper::toDTO));
        }

        try {
            accessControlService.checkHrViewPermission();
            Page<User> users = userService.getUsersByCurrentCompany(pageable);
            return ResponseEntity.ok(users.map(userMapper::toDTO));
        } catch (ForbiddenException ignored) {
            // no permission
        }

        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }

    @GetMapping("/{userId}")
    public ResponseEntity<UserDTO> getAccountById(
            @PathVariable Long userId,
            @AuthenticationPrincipal User currentUser) {
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
    public ResponseEntity<List<UserDTO>> searchAccounts(@RequestParam String keyword) {
        try {
            accessControlService.checkHrViewPermission();
        } catch (ForbiddenException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        List<User> users = userService.searchUsers(keyword);
        return ResponseEntity.ok(userMapper.toDTOList(users));
    }

    @PutMapping("/{userId}")
    public ResponseEntity<UserDTO> updateAccount(
            @PathVariable Long userId,
            @Valid @RequestBody UserDTO userDTO,
            @AuthenticationPrincipal User currentUser) {
        boolean hasEditPermission;
        try {
            accessControlService.checkHrEditPermission();
            hasEditPermission = true;
        } catch (ForbiddenException e) {
            hasEditPermission = false;
        }
        if (!hasEditPermission && !currentUser.getUserId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        User updatedUser = userService.updateUser(userId, userDTO, currentUser);
        return ResponseEntity.ok(userMapper.toDTO(updatedUser));
    }

    @PutMapping("/{userId}/password")
    public ResponseEntity<Map<String, String>> changePassword(
            @PathVariable Long userId,
            @Valid @RequestBody UpdatePasswordRequest request,
            @AuthenticationPrincipal User currentUser) {
        if (!currentUser.getUserId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        userService.changePassword(userId, request, currentUser);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Đổi mật khẩu thành công");
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{userId}/status")
    public ResponseEntity<Map<String, String>> toggleAccountStatus(
            @PathVariable Long userId,
            @AuthenticationPrincipal User currentUser) {
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
        User user = userService.toggleUserStatus(userId, currentUser);
        Map<String, String> response = new HashMap<>();
        response.put("message",
                user.getIsActive() ? "Kích hoạt tài khoản thành công" : "Vô hiệu hóa tài khoản thành công");
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{userId}/role")
    public ResponseEntity<Map<String, String>> updateUserRole(
            @PathVariable Long userId,
            @RequestParam Long companyId,
            @RequestParam String role,
            @AuthenticationPrincipal User currentUser) {
        if (!currentUser.isSystemAdminAccount()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        userService.updateUserRoleInCompany(userId, companyId, role, currentUser);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Cập nhật role thành công");
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{userId}/system-admin")
    public ResponseEntity<Map<String, String>> updateSystemAdminStatus(
            @PathVariable Long userId,
            @RequestParam Boolean isSystemAdmin,
            @AuthenticationPrincipal User currentUser) {
        if (!currentUser.isSystemAdminAccount()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        userService.updateSystemAdminStatus(userId, isSystemAdmin, currentUser);
        Map<String, String> response = new HashMap<>();
        response.put("message", isSystemAdmin ? "Đã cấp quyền System Admin" : "Đã thu hồi quyền System Admin");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Map<String, String>> deleteAccount(
            @PathVariable Long userId,
            @AuthenticationPrincipal User currentUser) {
        accessControlService.checkAdminPermission(currentUser);
        userService.deleteUser(userId, currentUser);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Xóa tài khoản thành công");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/role/{role}")
    public ResponseEntity<List<UserDTO>> getUsersByRole(@PathVariable CompanyRole role) {
        try {
            accessControlService.checkHrViewPermission();
        } catch (ForbiddenException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        List<User> users = userService.getUsersByRole(role);
        return ResponseEntity.ok(userMapper.toDTOList(users));
    }

    @GetMapping("/active")
    public ResponseEntity<List<UserDTO>> getActiveUsers() {
        try {
            accessControlService.checkHrViewPermission();
        } catch (ForbiddenException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(userMapper.toDTOList(userService.getActiveUsers()));
    }

    @GetMapping("/online")
    public ResponseEntity<List<UserDTO>> getOnlineUsers() {
        try {
            accessControlService.checkHrViewPermission();
        } catch (ForbiddenException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(userMapper.toDTOList(userService.getOnlineUsers()));
    }

    @GetMapping("/count/role/{role}")
    public ResponseEntity<Map<String, Long>> countUsersByRole(@PathVariable CompanyRole role) {
        try {
            accessControlService.checkHrViewPermission();
        } catch (ForbiddenException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Map<String, Long> response = new HashMap<>();
        response.put("count", userService.countUsersByRole(role));
        response.put("role", (long) role.ordinal());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/count/online")
    public ResponseEntity<Map<String, Long>> countOnlineUsers() {
        try {
            accessControlService.checkHrViewPermission();
        } catch (ForbiddenException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Map<String, Long> response = new HashMap<>();
        response.put("count", userService.countOnlineUsers());
        return ResponseEntity.ok(response);
    }
}
