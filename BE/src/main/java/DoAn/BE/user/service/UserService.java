package DoAn.BE.user.service;

import java.util.List;
import java.util.Optional;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;

import DoAn.BE.common.config.CacheConfig;

import DoAn.BE.common.event.UserCreatedEvent;
import DoAn.BE.common.event.UserDeletedEvent;
import DoAn.BE.common.event.UserUpdatedEvent;
import DoAn.BE.company.entity.CompanyMember;
import DoAn.BE.company.entity.CompanyRole;
import DoAn.BE.company.repository.CompanyMemberRepository;
import DoAn.BE.company.service.RoleTemplateService;
import DoAn.BE.common.context.TenantContext;
import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.DuplicateException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.user.dto.CreateUserRequest;
import DoAn.BE.user.dto.UpdatePasswordRequest;
import DoAn.BE.user.dto.UserDTO;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;

@Service
@Transactional
@Slf4j
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final CompanyMemberRepository companyMemberRepository;
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
        if (request.getPassword() == null || request.getPassword().length() < 8) {
            throw new BadRequestException("Password must be at least 8 characters");
        }

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateException("Username already exists");
        }
        if (request.getEmail() != null && userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateException("Email already exists");
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

        if (eventPublisher != null) {
            eventPublisher.publishEvent(new UserCreatedEvent(this, user));
        }

        log.info("Created new user: {}", user.getUsername());

        return user;
    }

    @Cacheable(value = CacheConfig.CACHE_USERS, key = "#id")
    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    public List<User> getAllUsers() {
        Long companyId = TenantContext.getCompanyId();
        if (companyId != null) {
            return userSaasService.getUsersByCurrentCompanyWithoutPaging();
        }
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

    public Page<User> getAllUsers(Pageable pageable) {
        return userRepository.findAll(pageable);
    }

    public User updateUser(Long id, UserDTO userDTO, User currentUser) {
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
        if (userDTO.getRole() != null && !currentUser.getUserId().equals(id)) {
            Long companyIdC = TenantContext.getCompanyId();
            if (companyIdC != null) {
                CompanyMember member = companyMemberRepository.findByUser_UserIdAndCompany_CompanyId(id, companyIdC)
                        .orElse(null);
                if (member != null) {
                    CompanyRole newRole = userDTO.getRole();
                    if (newRole != null && (!member.hasAnyRole(newRole) || member.getRoles().size() > 1)) {
                        member.getRoles().clear();
                        member.getRoles().add(newRole);
                        member.setPermissions(roleTemplateService.getTemplate(java.util.Set.of(newRole)));
                        companyMemberRepository.save(member);
                        if (eventPublisher != null) {
                            eventPublisher.publishEvent(new UserUpdatedEvent(this, user, currentUser,
                                    UserUpdatedEvent.UpdateType.ROLE_UPDATE));
                        }
                    }
                } else {
                    log.warn("User {} is not a member of company {}. Skipping role update.", id, companyIdC);
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
        if (request.getOldPassword() == null) {
            throw new BadRequestException("Old password is required");
        }

        User user = getUserById(userId);

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Old password incorrect");
        }

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("Password confirmation does not match");
        }

        if (request.getNewPassword().length() < 8) {
            throw new BadRequestException("Password must be at least 8 characters");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    public User toggleUserStatus(Long userId, User currentUser) {
        if (currentUser.getUserId().equals(userId)) {
            throw new BadRequestException("Cannot toggle your own account status");
        }
        log.info("User {} toggling status of user ID: {}", currentUser.getUsername(), userId);
        User user = getUserById(userId);
        user.setIsActive(!user.getIsActive());
        return userRepository.save(user);
    }

    public void deleteUser(Long userId, User currentUser) {
        log.info("Admin {} requesting delete user ID: {}", currentUser.getUsername(), userId);
        if (currentUser.getUserId().equals(userId)) {
            throw new BadRequestException("Cannot delete your own account");
        }

        User user = getUserById(userId);

        if (user.isSystemAdminAccount()) {
            throw new BadRequestException("Cannot delete a system admin account");
        }
        user.setIsDeleted(true);
        user.setIsActive(false);
        userRepository.save(user);

        if (eventPublisher != null) {
            eventPublisher.publishEvent(new UserDeletedEvent(this, user, currentUser));
        }
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
