package DoAn.BE.user.controller;

import DoAn.BE.common.util.SecurityUtil;
import DoAn.BE.user.dto.CreateUserRequest;
import DoAn.BE.user.dto.UpdateUserRequest;
import DoAn.BE.user.dto.UserDTO;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.mapper.UserMapper;
import DoAn.BE.user.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

// Controller quản lý users (CRUD, activate/deactivate, search)
@RestController
@RequestMapping("/api/users")
public class UserController {
    
    private final UserService userService;
    private final UserMapper userMapper;

    public UserController(UserService userService, UserMapper userMapper) {
        this.userService = userService;
        this.userMapper = userMapper;
    }
    
    /**
     * Tạo user mới
     * POST /api/users
     */
    @PostMapping
    public ResponseEntity<UserDTO> createUser(@Valid @RequestBody CreateUserRequest request) {
        User user = userService.createUser(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(userMapper.toDTO(user));
    }
    
    /**
     * Lấy thông tin user theo ID
     * GET /api/users/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> getUserById(@PathVariable Long id) {
        User user = userService.getUserById(id);
        return ResponseEntity.ok(userMapper.toDTO(user));
    }
    
    /**
     * Lấy danh sách tất cả users
     * GET /api/users
     */
    @GetMapping
    public ResponseEntity<List<UserDTO>> getAllUsers() {
        List<User> users = userService.getAllUsers();
        return ResponseEntity.ok(userMapper.toDTOList(users));
    }
    
    /**
     * Cập nhật thông tin user
     * PUT /api/users/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<UserDTO> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request) {
        User user = userService.updateUser(id, request);
        return ResponseEntity.ok(userMapper.toDTO(user));
    }
    
    /**
     * Xóa user
     * DELETE /api/users/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteUser(@PathVariable Long id) {
        User currentUser = SecurityUtil.getCurrentUser();
        userService.deleteUser(id, currentUser);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Xóa user thành công");
        return ResponseEntity.ok(response);
    }
    
    /**
     * Kích hoạt user
     * PATCH /api/users/{id}/activate
     */
    @PatchMapping("/{id}/activate")
    public ResponseEntity<UserDTO> activateUser(@PathVariable Long id) {
        User user = userService.activateUser(id);
        return ResponseEntity.ok(userMapper.toDTO(user));
    }
    
    /**
     * Vô hiệu hóa user
     * PATCH /api/users/{id}/deactivate
     */
    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<UserDTO> deactivateUser(@PathVariable Long id) {
        User user = userService.deactivateUser(id);
        return ResponseEntity.ok(userMapper.toDTO(user));
    }
    
    /**
     * Tìm kiếm users
     * GET /api/users/search?keyword=xxx
     */
    @GetMapping("/search")
    public ResponseEntity<List<UserDTO>> searchUsers(@RequestParam String keyword) {
        List<User> users = userService.searchUsers(keyword);
        return ResponseEntity.ok(userMapper.toDTOList(users));
    }
    
    /**
     * Lấy users theo role
     * GET /api/users/role/{role}
     */
    @GetMapping("/role/{role}")
    public ResponseEntity<List<UserDTO>> getUsersByRole(@PathVariable User.Role role) {
        List<User> users = userService.getUsersByRole(role);
        return ResponseEntity.ok(userMapper.toDTOList(users));
    }
    
    /**
     * Lấy danh sách users đang active
     * GET /api/users/active
     */
    @GetMapping("/active")
    public ResponseEntity<List<UserDTO>> getActiveUsers() {
        List<User> users = userService.getActiveUsers();
        return ResponseEntity.ok(userMapper.toDTOList(users));
    }
    
    /**
     * Lấy danh sách users đang online
     * GET /api/users/online
     */
    @GetMapping("/online")
    public ResponseEntity<List<UserDTO>> getOnlineUsers() {
        List<User> users = userService.getOnlineUsers();
        return ResponseEntity.ok(userMapper.toDTOList(users));
    }
    
    /**
     * Đếm số users theo role
     * GET /api/users/count/role/{role}
     */
    @GetMapping("/count/role/{role}")
    public ResponseEntity<Map<String, Long>> countUsersByRole(@PathVariable User.Role role) {
        long count = userService.countUsersByRole(role);
        Map<String, Long> response = new HashMap<>();
        response.put("count", count);
        response.put("role", (long) role.ordinal());
        return ResponseEntity.ok(response);
    }
    
    /**
     * Đếm số users đang online
     * GET /api/users/count/online
     */
    @GetMapping("/count/online")
    public ResponseEntity<Map<String, Long>> countOnlineUsers() {
        long count = userService.countOnlineUsers();
        Map<String, Long> response = new HashMap<>();
        response.put("count", count);
        return ResponseEntity.ok(response);
    }
}

