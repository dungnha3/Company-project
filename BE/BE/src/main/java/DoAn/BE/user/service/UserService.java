package DoAn.BE.user.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;

import DoAn.BE.common.event.UserCreatedEvent;
import DoAn.BE.common.event.UserDeletedEvent;
import DoAn.BE.common.event.UserUpdatedEvent;
import DoAn.BE.company.entity.CompanyMember;
import DoAn.BE.company.entity.CompanyRole;
import DoAn.BE.company.repository.CompanyMemberRepository;
import DoAn.BE.company.repository.CompanyRepository;
import DoAn.BE.company.service.RoleTemplateService;
import DoAn.BE.hrm.entity.Position;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.entity.Department;
import DoAn.BE.hrm.repository.PositionRepository;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.hrm.repository.DepartmentRepository;
import DoAn.BE.common.context.TenantContext;
import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.DuplicateException;
import DoAn.BE.common.exception.EntityNotFoundException;
import DoAn.BE.user.dto.CreateAccountWithEmployeeRequest;
import DoAn.BE.user.dto.CreateUserRequest;
import DoAn.BE.user.dto.UpdatePasswordRequest;
import DoAn.BE.user.dto.UpdateUserRequest;
import DoAn.BE.user.dto.UserDTO;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;

// [Service managing users - Core CRUD operations] (Role: Admin/HR)
@Service
@Transactional
@Slf4j
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final PositionRepository positionRepository;
    private final CompanyMemberRepository companyMemberRepository;
    private final CompanyRepository companyRepository;
    private final RoleTemplateService roleTemplateService;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;

    // Delegated services
    private final UserSaasService userSaasService;
    private final UserQueryService userQueryService;

    // Create new User
    public User createUser(CreateUserRequest request) {
        // [GUARD CLAUSE]
        if (request == null) {
            throw new BadRequestException("Create user request cannot be empty");
        }
        if (request.getUsername() == null || request.getUsername().trim().isEmpty()) {
            throw new BadRequestException("Username cannot be empty");
        }
        if (request.getPassword() == null || request.getPassword().length() < 6) {
            throw new BadRequestException("Password must be at least 6 characters");
        }

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateException("Username already exists");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setEmail(request.getEmail());

        user.setIsActive(true);
        user.setIsSystemAdmin(request.getIsSystemAdmin() != null ? request.getIsSystemAdmin() : false); // Default false
        user.setPhoneNumber(request.getPhoneNumber());
        user.setAvatarUrl(request.getAvatarUrl());
        user = userRepository.save(user);

        // EVENT DRIVEN
        if (eventPublisher != null) {
            eventPublisher.publishEvent(new UserCreatedEvent(this, user));
            log.info("📢 Published UserCreatedEvent for user: {}", user.getUsername());
        }

        log.info("Created new user: {}", user.getUsername());

        return user;
    }

    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    // ==================== SAAS OPERATIONS (Delegated to UserSaasService)
    public Page<User> getUsersByCurrentCompany(Pageable pageable) {
        return userSaasService.getUsersByCurrentCompany(pageable);
    }

    public List<User> getUsersByCurrentCompanyWithoutPaging() {
        return userSaasService.getUsersByCurrentCompanyWithoutPaging();
    }

    public Page<User> getUsersByCompanyId(Long companyId, Pageable pageable) {
        return userSaasService.getUsersByCompanyId(companyId, pageable);
    }

    public void updateUserRoleInCompany(Long userId, Long companyId, String roleName, User currentUser) {
        userSaasService.updateUserRoleInCompany(userId, companyId, roleName, currentUser);
    }

    public void updateSystemAdminStatus(Long userId, Boolean isSystemAdmin, User currentUser) {
        userSaasService.updateSystemAdminStatus(userId, isSystemAdmin, currentUser);
    }

    public User updateUser(Long id, UpdateUserRequest request) {
        User user = getUserById(id);
        Boolean oldIsActive = user.getIsActive();

        if (request.getUsername() != null && !request.getUsername().equals(user.getUsername())) {
            if (userRepository.existsByUsername(request.getUsername())) {
                throw new DuplicateException("Username already exists");
            }
            user.setUsername(request.getUsername());
        }

        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new DuplicateException("Email already exists");
            }
            user.setEmail(request.getEmail());
        }

        Long companyId = TenantContext.getCompanyId();
        CompanyMember currentMember = null;
        if (companyId != null) {
            currentMember = companyMemberRepository.findByUser_UserIdAndCompany_CompanyId(id, companyId).orElse(null);
        }

        User currentUser = null;
        try {
            currentUser = DoAn.BE.common.util.SecurityUtil.getCurrentUser();
        } catch (Exception e) {
            currentUser = user;
        }

        if (request.getPhoneNumber() != null) {
            user.setPhoneNumber(request.getPhoneNumber());
        }
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl());
        }

        if (request.getIsActive() != null && !request.getIsActive().equals(oldIsActive)) {
            user.setIsActive(request.getIsActive());
        }

        if (request.getIsSystemAdmin() != null && !request.getIsSystemAdmin().equals(user.getIsSystemAdmin())) {
            if (currentUser != null && currentUser.isSystemAdminAccount()) {
                user.setIsSystemAdmin(request.getIsSystemAdmin());
            } else {
                log.warn("User {} tried to change System Admin status without permission",
                        currentUser != null ? currentUser.getUsername() : "Unknown");
            }
        }

        if (request.getRole() != null && currentMember != null) {
            CompanyRole newRole = request.getRole();
            if (!newRole.equals(currentMember.getRole())) {
                currentMember.setRole(newRole);
                companyMemberRepository.save(currentMember);
                if (eventPublisher != null) {
                    eventPublisher.publishEvent(
                            new UserUpdatedEvent(this, user, currentUser, UserUpdatedEvent.UpdateType.ROLE_UPDATE));
                }
            }
        } else if (request.getRole() != null && currentMember == null && companyId != null) {
            Optional<DoAn.BE.company.entity.Company> companyOpt = companyRepository.findById(companyId);
            if (companyOpt.isPresent()) {
                CompanyRole companyRole = request.getRole();
                CompanyMember member = new CompanyMember();
                member.setUser(user);
                member.setCompany(companyOpt.get());
                member.setRole(companyRole);
                member.setJoinedAt(LocalDateTime.now());
                member.setIsActive(true);
                companyMemberRepository.save(member);
                log.info("✅ Created CompanyMember for user: {} with role: {}", user.getUsername(), companyRole);
            }
        }

        User savedUser = userRepository.save(user);

        return savedUser;
    }

    public User activateUser(Long id) {
        User user = getUserById(id);
        user.setIsActive(true);
        user = userRepository.save(user);

        if (eventPublisher != null) {
            eventPublisher.publishEvent(
                    new UserUpdatedEvent(this, user, user, UserUpdatedEvent.UpdateType.STATUS_CHANGE_ACTIVATED));
        }
        log.info("Activated user: {}", user.getUsername());
        return user;
    }

    public User deactivateUser(Long id) {
        User user = getUserById(id);
        user.setIsActive(false);
        user = userRepository.save(user);

        if (eventPublisher != null) {
            eventPublisher.publishEvent(
                    new UserUpdatedEvent(this, user, user, UserUpdatedEvent.UpdateType.STATUS_CHANGE_DEACTIVATED));
        }
        log.info("Deactivated user: {}", user.getUsername());
        return user;
    }

    // ==================== SEARCH & STATS (Delegated to UserQueryService)
    public List<User> searchUsers(String keyword) {
        return userQueryService.searchUsers(keyword);
    }

    public List<User> getUsersByRole(CompanyRole role) {
        return userQueryService.getUsersByRole(role);
    }

    public List<User> getActiveUsers() {
        return userQueryService.getActiveUsers();
    }

    public List<User> getOnlineUsers() {
        return userQueryService.getOnlineUsers();
    }

    public long countUsersByRole(CompanyRole role) {
        return userQueryService.countUsersByRole(role);
    }

    public long countOnlineUsers() {
        return userQueryService.countOnlineUsers();
    }

    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }

    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    // [DEPRECATED] Create account with employee profile - For Seeding only
    @Deprecated
    public Employee createAccountWithEmployee(CreateAccountWithEmployeeRequest request, User currentUser) {
        if (request == null)
            throw new BadRequestException("Data cannot be empty");

        log.info("HR Manager {} creating user with employee profile: {}", currentUser.getUsername(),
                request.getUsername());

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateException("Username already exists");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateException("Email already exists");
        }

        // Create User
        User user = new User();
        user.setUsername(request.getUsername());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setEmail(request.getEmail());
        user.setIsActive(true);
        user.setPhoneNumber(request.getSoDienThoai());
        User savedUser = userRepository.save(user);

        // Create CompanyMember
        Long companyId = TenantContext.getCompanyId();
        if (companyId != null) {
            DoAn.BE.company.entity.Company company = companyRepository.findById(companyId)
                    .orElseThrow(() -> new EntityNotFoundException("Company not found"));

            CompanyRole role = CompanyRole.EMPLOYEE;
            if (request.getRole() != null) {
                try {
                    // Try to parse CompanyRole directly
                    role = CompanyRole.valueOf(request.getRole());
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid role in request: {}. Defaulting to EMPLOYEE.", request.getRole());
                }
            }

            CompanyMember member = new CompanyMember();
            member.setUser(savedUser);
            member.setCompany(company);
            member.setRole(role);
            member.setPermissions(roleTemplateService.getTemplate(role));
            member.setJoinedAt(LocalDateTime.now());
            member.setIsActive(true);
            companyMemberRepository.save(member);
            log.info("✅ Created CompanyMember for new employee: {} with role: {}", savedUser.getUsername(), role);
        }

        // Create Employee Profile
        Employee employee = new Employee();
        employee.setFullName(request.getHoTen());
        employee.setGender(request.getGioiTinh() != null ? Employee.Gender.valueOf(mapGender(request.getGioiTinh()))
                : Employee.Gender.MALE);
        employee.setAddress(request.getDiaChi());
        employee.setDateOfBirth(request.getNgaySinh());
        employee.setHireDate(request.getNgayVaoLam());
        employee.setPhone(request.getSoDienThoai());
        employee.setIdCard(request.getCccd());
        employee.setStatus(Employee.EmployeeStatus.ACTIVE);
        employee.setUser(savedUser);

        if (request.getPhongBanId() != null) {
            Department department = departmentRepository.findById(request.getPhongBanId())
                    .orElseThrow(() -> new EntityNotFoundException("Department not found"));
            employee.setDepartment(department);
        }

        if (request.getChucVuId() != null) {
            Position position = positionRepository.findById(request.getChucVuId())
                    .orElseThrow(() -> new EntityNotFoundException("Position not found"));
            employee.setPosition(position);
        }

        return employeeRepository.save(employee);
    }

    // Helper to map old Vietnamese gender string to English enum name
    private String mapGender(String vietnameseGender) {
        if ("Nam".equalsIgnoreCase(vietnameseGender))
            return "MALE";
        if ("Nữ".equalsIgnoreCase(vietnameseGender) || "Nu".equalsIgnoreCase(vietnameseGender))
            return "FEMALE";
        return "OTHER";
    }

    // [REMOVED] mapUserRoleToCompanyRole - User.Role is deprecated and removed

    public Page<User> getAllUsers(Pageable pageable) {
        return userRepository.findAll(pageable);
    }

    public User updateUser(Long id, UserDTO userDTO, User currentUser) {
        // ... implementation (same as before but simplified/optimized if needed)
        // For now, I'll reuse the logic from previous block or just keep it minimal if
        // the method above is the main one.
        // Wait, there are TWO updateUser methods in original file. The one with DTO is
        // used by Controller likely.
        // I will just delegate or copy.
        // To save space and time, and since I already refactored the *other*
        // updateUser,
        // I'll skip re-implementing this one fully if it's redundant.
        // But Controller calls this one.
        // I'll copy implementation.
        log.info("User {} updating user ID: {}", currentUser.getUsername(), id);

        User user = getUserById(id);

        if (userDTO.getUsername() != null && !userDTO.getUsername().equals(user.getUsername())) {
            if (userRepository.existsByUsername(userDTO.getUsername())) {
                throw new DuplicateException("Username already exists");
            }
            user.setUsername(userDTO.getUsername());
        }

        if (userDTO.getEmail() != null && !userDTO.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(userDTO.getEmail())) {
                throw new DuplicateException("Email already exists");
            }
            user.setEmail(userDTO.getEmail());
        }

        if (userDTO.getRole() != null) {
            Long companyIdC = TenantContext.getCompanyId();
            if (companyIdC != null) {
                CompanyMember member = companyMemberRepository.findByUser_UserIdAndCompany_CompanyId(id, companyIdC)
                        .orElse(null);
                if (member != null) {
                    CompanyRole newRole = userDTO.getRole();
                    if (newRole != null && !newRole.equals(member.getRole())) {
                        member.setRole(newRole);
                        member.setPermissions(roleTemplateService.getTemplate(newRole));
                        companyMemberRepository.save(member);
                        if (eventPublisher != null) {
                            eventPublisher.publishEvent(new UserUpdatedEvent(this, user, currentUser,
                                    UserUpdatedEvent.UpdateType.ROLE_UPDATE));
                        }
                    }
                } else {
                    Optional<DoAn.BE.company.entity.Company> companyOpt = companyRepository
                            .findById(companyIdC);
                    if (companyOpt.isPresent()) {
                        CompanyRole companyRole = userDTO.getRole();
                        if (companyRole != null) {
                            CompanyMember newMember = new CompanyMember();
                            newMember.setUser(user);
                            newMember.setCompany(companyOpt.get());
                            newMember.setRole(companyRole);
                            newMember.setPermissions(roleTemplateService.getTemplate(companyRole));
                            newMember.setJoinedAt(LocalDateTime.now());
                            newMember.setIsActive(true);
                            companyMemberRepository.save(newMember);
                        }
                    }
                }
            }
        }
        if (userDTO.getPhoneNumber() != null) {
            user.setPhoneNumber(userDTO.getPhoneNumber());
        }
        if (userDTO.getAvatarUrl() != null) {
            user.setAvatarUrl(userDTO.getAvatarUrl());
        }

        User savedUser = userRepository.save(user);

        if (eventPublisher != null) {
            eventPublisher.publishEvent(
                    new UserUpdatedEvent(this, savedUser, currentUser, UserUpdatedEvent.UpdateType.PROFILE_UPDATE));
        }

        return savedUser;
    }

    public void changePassword(Long userId, UpdatePasswordRequest request, User currentUser) {
        log.info("User {} changing password", currentUser.getUsername());

        if (request == null || request.getNewPassword() == null) {
            throw new BadRequestException("Invalid password data");
        }

        User user = getUserById(userId);

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Old password incorrect");
        }

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("Password confirmation does not match");
        }

        if (request.getNewPassword().length() < 6) {
            throw new BadRequestException("Password must be at least 6 characters");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    public User toggleUserStatus(Long userId, User currentUser) {
        log.info("User {} toggling status of user ID: {}", currentUser.getUsername(), userId);
        User user = getUserById(userId);
        user.setIsActive(!user.getIsActive());
        return userRepository.save(user);
    }

    public void deleteUser(Long userId, User currentUser) {
        log.info("Admin {} requesting delete user ID: {}", currentUser.getUsername(), userId);
        User user = getUserById(userId);

        if (eventPublisher != null) {
            eventPublisher.publishEvent(new UserDeletedEvent(this, user, currentUser));
        }

        user.setIsDeleted(true);
        user.setIsActive(false);
        userRepository.save(user);
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public User save(User user) {
        return userRepository.save(user);
    }

    public Optional<User> findById(Long userId) {
        return userRepository.findById(userId);
    }

    public Optional<User> findByResetPasswordToken(String token) {
        return userRepository.findByResetPasswordToken(token);
    }
}
