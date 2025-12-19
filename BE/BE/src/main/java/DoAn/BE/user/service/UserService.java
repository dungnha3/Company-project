package DoAn.BE.user.service;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.DuplicateException;
import DoAn.BE.common.exception.EntityNotFoundException;
import DoAn.BE.notification.service.AuthNotificationService;
import DoAn.BE.audit.service.AuditLogService;
import DoAn.BE.audit.entity.AuditLog;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.hr.entity.ChucVu;
import DoAn.BE.hr.entity.NhanVien;
import DoAn.BE.hr.entity.PhongBan;
import DoAn.BE.hr.repository.ChucVuRepository;
import DoAn.BE.hr.repository.NhanVienRepository;
import DoAn.BE.hr.repository.PhongBanRepository;
import DoAn.BE.user.dto.CreateAccountWithEmployeeRequest;
import DoAn.BE.user.dto.CreateUserRequest;
import DoAn.BE.user.dto.UpdatePasswordRequest;
import DoAn.BE.user.dto.UpdateUserRequest;
import DoAn.BE.user.dto.UserDTO;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;

// Service quản lý users (CRUD, search, role management, tích hợp với HR)
@Service
@Transactional
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final NhanVienRepository nhanVienRepository;
    private final PhongBanRepository phongBanRepository;
    private final ChucVuRepository chucVuRepository;
    private final AuthNotificationService authNotificationService;
    private final AuditLogService auditLogService;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder,
            NhanVienRepository nhanVienRepository, PhongBanRepository phongBanRepository,
            ChucVuRepository chucVuRepository, AuthNotificationService authNotificationService,
            AuditLogService auditLogService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.nhanVienRepository = nhanVienRepository;
        this.phongBanRepository = phongBanRepository;
        this.chucVuRepository = chucVuRepository;
        this.authNotificationService = authNotificationService;
        this.auditLogService = auditLogService;
    }

    public User createUser(CreateUserRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateException("User đã tồn tại");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setEmail(request.getEmail());
        user.setRole(request.getRole());
        user.setIsActive(true);
        user.setPhoneNumber(request.getPhoneNumber());
        user.setAvatarUrl(request.getAvatarUrl());
        user = userRepository.save(user);

        // AUTO-CREATE EMPLOYEE: Mỗi user đều là một nhân viên
        try {
            NhanVien employee = new NhanVien();
            employee.setUser(user);
            employee.setHoTen(extractFullNameFromUsername(user.getUsername()));
            employee.setNgaySinh(java.time.LocalDate.of(1990, 1, 1)); // Default birthdate
            employee.setGioiTinh(NhanVien.GioiTinh.Khác); // Default gender
            employee.setNgayVaoLam(java.time.LocalDate.now());
            employee.setTrangThai(NhanVien.TrangThaiNhanVien.DANG_LAM_VIEC);
            // PhongBan và ChucVu sẽ được update bởi DataSeed sau
            nhanVienRepository.save(employee);
            log.info("✅ Auto-created employee for user: {}", user.getUsername());
        } catch (Exception e) {
            log.error("❌ Failed to auto-create employee for user {}: {}", user.getUsername(), e.getMessage(), e);
            // Không throw exception để không block việc tạo user
        }

        // Gửi welcome notification
        authNotificationService.createWelcomeNotification(user.getUserId(), user.getUsername());

        // Audit log - ghi lại việc tạo user
        auditLogService.logAction(
                user, // actor (hoặc current user nếu có)
                "CREATE_USER",
                "USER",
                user.getUserId(),
                null,
                user,
                AuditLog.Severity.INFO,
                null,
                null);

        log.info("Created new user: {}", user.getUsername());

        return user;
    }

    /**
     * Extract full name from username (helper method)
     */
    private String extractFullNameFromUsername(String username) {
        // Convert username to readable name
        // Examples: "admin" -> "Admin", "hr_nguyen_van_a" -> "Nguyễn Văn A"
        if (username == null || username.isEmpty()) {
            return "Unknown";
        }

        // Remove common prefixes
        String cleanName = username
                .replaceFirst("^(admin|hr|acc|pm|emp)_?", "")
                .replace("_", " ");

        if (cleanName.isEmpty()) {
            // For simple usernames like "admin", "hr", capitalize first letter
            return username.substring(0, 1).toUpperCase() + username.substring(1);
        }

        // Capitalize each word
        String[] words = cleanName.split("\\s+");
        StringBuilder result = new StringBuilder();
        for (String word : words) {
            if (!word.isEmpty()) {
                result.append(Character.toUpperCase(word.charAt(0)))
                        .append(word.substring(1).toLowerCase())
                        .append(" ");
            }
        }
        return result.toString().trim();
    }

    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User không tồn tại"));

    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    // Cập nhật user (sử dụng bởi controller cũ - deprecated)
    public User updateUser(Long id, UpdateUserRequest request) {
        User user = getUserById(id);

        // Lưu old values để audit
        String oldUsername = user.getUsername();
        String oldEmail = user.getEmail();
        User.Role oldRole = user.getRole();
        Boolean oldIsActive = user.getIsActive();

        // Check duplicate username if changed
        if (request.getUsername() != null && !request.getUsername().equals(user.getUsername())) {
            if (userRepository.existsByUsername(request.getUsername())) {
                throw new DuplicateException("Username đã tồn tại");
            }
            user.setUsername(request.getUsername());
        }

        // Check duplicate email if changed
        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new DuplicateException("Email đã tồn tại");
            }
            user.setEmail(request.getEmail());
        }

        // Update other fields
        if (request.getPhoneNumber() != null) {
            user.setPhoneNumber(request.getPhoneNumber());
        }
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl());
        }
        if (request.getRole() != null && !request.getRole().equals(oldRole)) {
            user.setRole(request.getRole());
        }
        if (request.getIsActive() != null && !request.getIsActive().equals(oldIsActive)) {
            user.setIsActive(request.getIsActive());
        }

        User savedUser = userRepository.save(user);

        // Audit log nếu có thay đổi quan trọng
        if (!oldRole.equals(savedUser.getRole()) || !oldIsActive.equals(savedUser.getIsActive())) {
            log.warn("⚠️ User {} changed - Role: {} -> {}, Active: {} -> {}",
                    user.getUsername(), oldRole, savedUser.getRole(), oldIsActive, savedUser.getIsActive());
        }

        return savedUser;
    }

    public User activateUser(Long id) {
        User user = getUserById(id);

        // Không cần restrict activate vì đây là hành động tích cực
        user.setIsActive(true);
        user = userRepository.save(user);

        // Gửi notification
        authNotificationService.createAccountActivatedNotification(id);

        // Audit log
        auditLogService.logAction(
                user,
                "ACTIVATE_USER",
                "USER",
                user.getUserId(),
                false,
                true,
                AuditLog.Severity.INFO,
                null,
                null);

        log.info("Activated user: {}", user.getUsername());

        return user;
    }

    public User deactivateUser(Long id) {
        User user = getUserById(id);

        user.setIsActive(false);
        user = userRepository.save(user);

        // Gửi notification
        authNotificationService.createAccountDeactivatedNotification(id, null);

        // Audit log
        auditLogService.logAction(
                user,
                "DEACTIVATE_USER",
                "USER",
                user.getUserId(),
                true,
                false,
                AuditLog.Severity.WARNING,
                null,
                null);

        log.info("Deactivated user: {}", user.getUsername());

        return user;
    }

    // Tìm kiếm user theo keyword (username hoặc email) - optimized query
    public List<User> searchUsers(String keyword) {
        return userRepository.searchByKeyword(keyword);
    }

    public List<User> getUsersByRole(User.Role role) {
        return userRepository.findByRole(role);
    }

    public List<User> getActiveUsers() {
        return userRepository.findByIsActiveTrue();
    }

    public List<User> getOnlineUsers() {
        return userRepository.findByIsOnlineTrue();
    }

    public long countUsersByRole(User.Role role) {
        return userRepository.countByRole(role);
    }

    public long countOnlineUsers() {
        return userRepository.countByIsOnlineTrue();
    }

    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }

    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    /**
     * Tạo tài khoản kèm nhân viên
     */
    public NhanVien createAccountWithEmployee(CreateAccountWithEmployeeRequest request, User currentUser) {
        log.info("HR Manager {} tạo tài khoản kèm nhân viên: {}", currentUser.getUsername(), request.getUsername());

        // Kiểm tra tên đăng nhập đã tồn tại
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateException("Tên đăng nhập đã tồn tại");
        }

        // Kiểm tra email đã tồn tại
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateException("Email đã tồn tại");
        }

        // Tạo tài khoản
        User user = new User();
        user.setUsername(request.getUsername());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setEmail(request.getEmail());
        user.setRole(User.Role.valueOf(request.getRole()));
        user.setIsActive(true);
        user.setPhoneNumber(request.getSoDienThoai());
        User savedUser = userRepository.save(user);

        // Tạo nhân viên
        NhanVien nhanVien = new NhanVien();
        nhanVien.setHoTen(request.getHoTen());
        // Email được lưu trong User entity
        nhanVien.setGioiTinh(request.getGioiTinh() != null ? NhanVien.GioiTinh.valueOf(request.getGioiTinh())
                : NhanVien.GioiTinh.Nam);
        nhanVien.setDiaChi(request.getDiaChi());
        nhanVien.setNgaySinh(request.getNgaySinh());
        nhanVien.setNgayVaoLam(request.getNgayVaoLam());
        // Số điện thoại lưu cả trong User và NhanVien entity để hiển thị đúng
        nhanVien.setSdt(request.getSoDienThoai());
        nhanVien.setCccd(request.getCccd());
        nhanVien.setTrangThai(NhanVien.TrangThaiNhanVien.DANG_LAM_VIEC);
        nhanVien.setUser(savedUser);

        // Gán phòng ban và chức vụ nếu có
        if (request.getPhongBanId() != null) {
            PhongBan phongBan = phongBanRepository.findById(request.getPhongBanId())
                    .orElseThrow(() -> new EntityNotFoundException("Phòng ban không tồn tại"));
            nhanVien.setPhongBan(phongBan);
        }

        if (request.getChucVuId() != null) {
            ChucVu chucVu = chucVuRepository.findById(request.getChucVuId())
                    .orElseThrow(() -> new EntityNotFoundException("Chức vụ không tồn tại"));
            nhanVien.setChucVu(chucVu);
        }

        return nhanVienRepository.save(nhanVien);
    }

    /**
     * Lấy danh sách user có phân trang
     */
    public Page<User> getAllUsers(Pageable pageable) {
        return userRepository.findAll(pageable);
    }

    /**
     * Cập nhật user bằng DTO
     */
    public User updateUser(Long id, UserDTO userDTO, User currentUser) {
        log.info("User {} cập nhật thông tin user ID: {}", currentUser.getUsername(), id);

        User user = getUserById(id);
        User.Role oldRole = user.getRole();

        // Kiểm tra username trùng lặp
        if (userDTO.getUsername() != null && !userDTO.getUsername().equals(user.getUsername())) {
            if (userRepository.existsByUsername(userDTO.getUsername())) {
                throw new DuplicateException("Tên đăng nhập đã tồn tại");
            }
            user.setUsername(userDTO.getUsername());
        }

        // Kiểm tra email trùng lặp
        if (userDTO.getEmail() != null && !userDTO.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(userDTO.getEmail())) {
                throw new DuplicateException("Email đã tồn tại");
            }
            user.setEmail(userDTO.getEmail());
        }

        // Cập nhật các trường khác
        if (userDTO.getPhoneNumber() != null) {
            user.setPhoneNumber(userDTO.getPhoneNumber());
        }
        if (userDTO.getAvatarUrl() != null) {
            user.setAvatarUrl(userDTO.getAvatarUrl());
        }
        if (userDTO.getRole() != null && !userDTO.getRole().equals(oldRole)) {
            user.setRole(userDTO.getRole());

            // Audit log cho role change
            if (currentUser.isAdmin()) {
                log.warn("⚠️ Admin {} changed role of user {} from {} to {}",
                        currentUser.getUsername(), user.getUsername(), oldRole, userDTO.getRole());
            }
        }

        return userRepository.save(user);
    }

    /**
     * Đổi mật khẩu
     */
    public void changePassword(Long userId, UpdatePasswordRequest request, User currentUser) {
        log.info("User {} đổi mật khẩu", currentUser.getUsername());

        User user = getUserById(userId);

        // Kiểm tra mật khẩu cũ
        if (!passwordEncoder.matches(request.getOldPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Mật khẩu cũ không chính xác");
        }

        // Kiểm tra xác nhận mật khẩu
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("Xác nhận mật khẩu không khớp");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    /**
     * Bật/tắt trạng thái tài khoản
     */
    public User toggleUserStatus(Long userId, User currentUser) {
        log.info("User {} thay đổi trạng thái user ID: {}", currentUser.getUsername(), userId);

        User user = getUserById(userId);
        user.setIsActive(!user.getIsActive());
        return userRepository.save(user);
    }

    /**
     * Xóa user
     */
    public void deleteUser(Long userId, User currentUser) {
        log.info("Admin {} xóa user ID: {}", currentUser.getUsername(), userId);

        User user = getUserById(userId);

        // Audit log trước khi xóa
        auditLogService.logAction(
                currentUser,
                "DELETE_USER",
                "USER",
                userId,
                user,
                null,
                AuditLog.Severity.CRITICAL,
                null,
                null);

        userRepository.delete(user);
        log.warn("⚠️ User {} deleted by Admin {}", user.getUsername(), currentUser.getUsername());
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public User save(User user) {
        return userRepository.save(user);
    }
}
