package DoAn.BE.user.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.DuplicateException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.user.dto.CreateUserRequest;
import DoAn.BE.user.dto.UpdatePasswordRequest;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import DoAn.BE.company.repository.CompanyMemberRepository;
import DoAn.BE.company.repository.CompanyRepository;
import DoAn.BE.company.service.RoleTemplateService;

@ExtendWith(MockitoExtension.class)
public class UserServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private UserSaasService userSaasService;
    @Mock
    private UserQueryService userQueryService;
    @Mock
    private CompanyMemberRepository companyMemberRepository;
    @Mock
    private CompanyRepository companyRepository;
    @Mock
    private RoleTemplateService roleTemplateService;
    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private UserService userService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setUserId(1L);
        testUser.setUsername("john_doe");
        testUser.setEmail("john@example.com");
        testUser.setPasswordHash("hashed_old_password");
        testUser.setIsActive(true);
        testUser.setIsSystemAdmin(false);
    }

    @Test
    void createUser_Success() {
        CreateUserRequest req = new CreateUserRequest();
        req.setUsername("new_user");
        req.setPassword("Password123!");
        req.setEmail("new@example.com");

        when(userRepository.existsByUsername("new_user")).thenReturn(false);
        when(passwordEncoder.encode("Password123!")).thenReturn("hashed_new_password");
        when(userRepository.save(any(User.class))).thenAnswer(i -> {
            User u = i.getArgument(0);
            u.setUserId(2L);
            return u;
        });

        User result = userService.createUser(req);

        assertNotNull(result);
        assertEquals("new_user", result.getUsername());
        assertEquals(2L, result.getUserId());
        assertTrue(result.getIsActive());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void createUser_DuplicateUsername_ThrowsDuplicateException() {
        CreateUserRequest req = new CreateUserRequest();
        req.setUsername("john_doe");
        req.setPassword("Password123!");

        when(userRepository.existsByUsername("john_doe")).thenReturn(true);

        assertThrows(DuplicateException.class, () -> userService.createUser(req));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void createUser_InvalidPassword_ThrowsBadRequest() {
        CreateUserRequest req = new CreateUserRequest();
        req.setUsername("new_user");
        req.setPassword("123"); // Too short

        assertThrows(BadRequestException.class, () -> userService.createUser(req));
    }

    @Test
    void getUserById_Success() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

        User result = userService.getUserById(1L);

        assertNotNull(result);
        assertEquals("john_doe", result.getUsername());
    }

    @Test
    void getUserById_NotFound_ThrowsResourceNotFound() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> userService.getUserById(99L));
    }

    @Test
    void changePassword_Success() {
        UpdatePasswordRequest req = new UpdatePasswordRequest();
        req.setOldPassword("old_pass");
        req.setNewPassword("new_pass123");
        req.setConfirmPassword("new_pass123");

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("old_pass", "hashed_old_password")).thenReturn(true);
        when(passwordEncoder.encode("new_pass123")).thenReturn("hashed_new_super_password");

        userService.changePassword(1L, req, testUser);

        assertEquals("hashed_new_super_password", testUser.getPasswordHash());
        verify(userRepository).save(testUser);
    }

    @Test
    void changePassword_IncorrectOldPassword_ThrowsBadRequest() {
        UpdatePasswordRequest req = new UpdatePasswordRequest();
        req.setOldPassword("wrong_old_pass");
        req.setNewPassword("new_pass123");
        req.setConfirmPassword("new_pass123");

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("wrong_old_pass", "hashed_old_password")).thenReturn(false);

        assertThrows(BadRequestException.class, () -> userService.changePassword(1L, req, testUser));
        verify(userRepository, never()).save(any());
    }

    @Test
    void changePassword_MismatchedConfirmPassword_ThrowsBadRequest() {
        UpdatePasswordRequest req = new UpdatePasswordRequest();
        req.setOldPassword("old_pass");
        req.setNewPassword("new_pass123");
        req.setConfirmPassword("different_pass");

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("old_pass", "hashed_old_password")).thenReturn(true);

        assertThrows(BadRequestException.class, () -> userService.changePassword(1L, req, testUser));
        verify(userRepository, never()).save(any());
    }

    @Test
    void toggleUserStatus_Success() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        assertTrue(testUser.getIsActive());

        User toggledUser = userService.toggleUserStatus(1L, testUser);

        assertFalse(toggledUser.getIsActive());
        verify(userRepository).save(testUser);
    }
}
