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
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.user.dto.UpdatePasswordRequest;
import DoAn.BE.user.dto.UpdateUserRequest;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
public class ProfileServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private ProfileService profileService;

    private User testUser;
    private Employee testEmployee;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setUserId(1L);
        testUser.setUsername("alice");
        testUser.setEmail("alice@example.com");
        testUser.setPasswordHash("hashed_old_pass");

        testEmployee = new Employee();
        testEmployee.setEmployeeId(100L);
        testEmployee.setUser(testUser);
        testEmployee.setFullName("Alice Smith");
    }

    @Test
    void getCurrentUserProfile_Success() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

        User result = profileService.getCurrentUserProfile(1L);

        assertNotNull(result);
        assertEquals("alice", result.getUsername());
    }

    @Test
    void getCurrentUserProfile_NotFound_ThrowsException() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> profileService.getCurrentUserProfile(99L));
    }

    @Test
    void updateProfile_Success_WithEmployee() {
        UpdateUserRequest req = new UpdateUserRequest();
        req.setEmail("alice.new@example.com");
        req.setFullName("Alice Updated");
        req.setAvatarUrl("https://example.com/avatar.jpg");

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(employeeRepository.findByUser_UserId(1L)).thenReturn(Optional.of(testEmployee));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        User result = profileService.updateProfile(1L, req);

        assertEquals("alice.new@example.com", result.getEmail());
        assertEquals("https://example.com/avatar.jpg", result.getAvatarUrl());

        verify(employeeRepository).save(testEmployee);
        assertEquals("Alice Updated", testEmployee.getFullName());
    }

    @Test
    void changePassword_Success_FiresEvent() {
        UpdatePasswordRequest req = new UpdatePasswordRequest();
        req.setOldPassword("old_pass");
        req.setNewPassword("new_pass123");

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("old_pass", "hashed_old_pass")).thenReturn(true);
        when(passwordEncoder.encode("new_pass123")).thenReturn("hashed_new_pass");

        profileService.changePassword(1L, req);

        assertEquals("hashed_new_pass", testUser.getPasswordHash());
        verify(userRepository).save(testUser);
        verify(eventPublisher).publishEvent(any(DoAn.BE.common.event.UserUpdatedEvent.class));
    }

    @Test
    void changePassword_IncorrectOldPassword_ThrowsBadRequest() {
        UpdatePasswordRequest req = new UpdatePasswordRequest();
        req.setOldPassword("wrong_pass");
        req.setNewPassword("new_pass123");

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("wrong_pass", "hashed_old_pass")).thenReturn(false);

        assertThrows(BadRequestException.class, () -> profileService.changePassword(1L, req));
    }

    @Test
    void setUserOnline_Success() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

        profileService.setUserOnline(1L);

        assertEquals(DoAn.BE.user.entity.User.PresenceStatus.ONLINE, testUser.getPresenceStatus());
        verify(userRepository).save(testUser);
    }
}
