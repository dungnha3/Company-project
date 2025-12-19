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
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import DoAn.BE.common.util.PermissionUtil;
import DoAn.BE.hr.entity.NhanVien;
import DoAn.BE.hr.service.NhanVienService;
import DoAn.BE.user.dto.CreateAccountWithEmployeeRequest;
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
    private final NhanVienService nhanVienService;
    private final UserMapper userMapper;
    
    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (User) auth.getPrincipal();
    }
    
    // Tạo tài khoản kèm nhân viên - Chỉ HR Manager
    @PostMapping("/with-employee")
    public ResponseEntity<Map<String, Object>> createAccountWithEmployee(
            @Valid @RequestBody CreateAccountWithEmployeeRequest request) {
        User currentUser = getCurrentUser();
        PermissionUtil.checkHRPermission(currentUser);
        
        NhanVien nhanVien = userService.createAccountWithEmployee(request, currentUser);
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Tạo tài khoản và nhân viên thành công");
        response.put("data", nhanVien);
        
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
    
    /**
     * Lấy danh sách tài khoản có phân trang - Chỉ Admin và HR Manager
     */
    @GetMapping
    public ResponseEntity<Page<UserDTO>> getAllAccounts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "userId") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        
        User currentUser = getCurrentUser();
        if (!currentUser.isAdmin() && !currentUser.isManagerHR()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        
        Sort sort = sortDir.equalsIgnoreCase("desc") ? 
            Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);
        
        Page<User> users = userService.getAllUsers(pageable);
        Page<UserDTO> userDTOs = users.map(userMapper::toDTO);
        
        return ResponseEntity.ok(userDTOs);
    }
    
    /**
     * Lấy thông tin tài khoản theo ID - Admin, HR Manager hoặc chính chủ
     */
    @GetMapping("/{userId}")
    public ResponseEntity<UserDTO> getAccountById(@PathVariable Long userId) {
        User currentUser = getCurrentUser();
        
        // Kiểm tra quyền xem
        if (!currentUser.isAdmin() && !currentUser.isManagerHR() && 
            !currentUser.getUserId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        
        User user = userService.getUserById(userId);
        return ResponseEntity.ok(userMapper.toDTO(user));
    }
    
    /**
     * Cập nhật thông tin tài khoản - Admin, HR Manager hoặc chính chủ
     */
    @PutMapping("/{userId}")
    public ResponseEntity<UserDTO> updateAccount(
            @PathVariable Long userId,
            @Valid @RequestBody UserDTO userDTO) {
        
        User currentUser = getCurrentUser();
        
        // Kiểm tra quyền sửa
        if (!currentUser.isAdmin() && !currentUser.isManagerHR() && 
            !currentUser.getUserId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        
        User updatedUser = userService.updateUser(userId, userDTO, currentUser);
        return ResponseEntity.ok(userMapper.toDTO(updatedUser));
    }
    
    /**
     * Đổi mật khẩu - Chính chủ tài khoản
     */
    @PutMapping("/{userId}/password")
    public ResponseEntity<Map<String, String>> changePassword(
            @PathVariable Long userId,
            @Valid @RequestBody UpdatePasswordRequest request) {
        
        User currentUser = getCurrentUser();
        
        // Chỉ cho phép đổi mật khẩu của chính mình
        if (!currentUser.getUserId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        
        userService.changePassword(userId, request, currentUser);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Đổi mật khẩu thành công");
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Kích hoạt/Vô hiệu hóa tài khoản - Chỉ Admin và HR Manager
     */
    @PutMapping("/{userId}/status")
    public ResponseEntity<Map<String, String>> toggleAccountStatus(@PathVariable Long userId) {
        User currentUser = getCurrentUser();
        
        if (!currentUser.isAdmin() && !currentUser.isManagerHR()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        
        User user = userService.toggleUserStatus(userId, currentUser);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", user.getIsActive() ? "Kích hoạt tài khoản thành công" : "Vô hiệu hóa tài khoản thành công");
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Xóa tài khoản - Chỉ Admin
     */
    @DeleteMapping("/{userId}")
    public ResponseEntity<Map<String, String>> deleteAccount(@PathVariable Long userId) {
        User currentUser = getCurrentUser();
        PermissionUtil.checkAdminPermission(currentUser);
        
        userService.deleteUser(userId, currentUser);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Xóa tài khoản thành công");
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Tìm kiếm tài khoản - Admin và HR Manager
     */
    @GetMapping("/search")
    public ResponseEntity<List<UserDTO>> searchAccounts(
            @RequestParam String keyword) {
        
        User currentUser = getCurrentUser();
        if (!currentUser.isAdmin() && !currentUser.isManagerHR()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        
        List<User> users = userService.searchUsers(keyword);
        List<UserDTO> userDTOs = users.stream()
            .map(userMapper::toDTO)
            .toList();
        
        return ResponseEntity.ok(userDTOs);
    }
}
