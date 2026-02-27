package DoAn.BE.auth.service;

import DoAn.BE.auth.dto.AuthResponse;
import DoAn.BE.auth.dto.LoginRequest;
import DoAn.BE.auth.dto.RegisterRequest;
import DoAn.BE.auth.entity.RefreshToken;
import DoAn.BE.auth.repository.LoginAttemptRepository;
import DoAn.BE.auth.repository.RefreshTokenRepository;
import DoAn.BE.audit.service.AuditLogService;
import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.UnauthorizedException;
import DoAn.BE.company.entity.CompanyMember;
import DoAn.BE.company.entity.CompanyRole;
import DoAn.BE.company.entity.Company;
import DoAn.BE.company.repository.CompanyMemberRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.entity.PersonalWorkspace;
import DoAn.BE.user.repository.PersonalWorkspaceRepository;
import DoAn.BE.user.service.UserService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

// Unit tests for AuthService — the core authentication layer.
// Uses pure Mockito (no Spring context) for fast and reliable tests.
// /
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    // ===== Mocks =====
    @Mock
    private UserService userService;
    @Mock
    private JwtService jwtService;
    @Mock
    private SessionService sessionService;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private RefreshTokenRepository refreshTokenRepository;
    @Mock
    private LoginAttemptRepository loginAttemptRepository;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private CompanyMemberRepository companyMemberRepository;
    @Mock
    private AuditLogService auditLogService;
    @Mock
    private WebClient.Builder webClientBuilder;
    @Mock
    private WebClient webClient;
    @Mock
    private PersonalWorkspaceRepository personalWorkspaceRepository;

    private AuthService authService;

    // ===== Test Data =====
    private User testUser;
    private static final String TEST_IP = "127.0.0.1";
    private static final String TEST_UA = "JUnit/5";

    @BeforeEach
    void setUp() {
        // WebClient.Builder mock chain
        when(webClientBuilder.build()).thenReturn(webClient);

        authService = new AuthService(
                userService, jwtService, sessionService, passwordEncoder,
                refreshTokenRepository, loginAttemptRepository, eventPublisher,
                companyMemberRepository, auditLogService, webClientBuilder,
                personalWorkspaceRepository,
                5, // maxLoginAttempts
                15, // lockoutDurationMinutes
                "https://oauth2.googleapis.com/tokeninfo",
                "https://ui-avatars.com/api/?name=%s&background=random&color=fff&size=128");

        testUser = new User();
        testUser.setUserId(1L);
        testUser.setUsername("testuser");
        testUser.setEmail("test@dacn.com");
        testUser.setPasswordHash("$2a$10$hashedPassword");
        testUser.setIsActive(true);
        testUser.setStatus(User.UserStatus.ACTIVE);
    }
    // LOGIN TESTS
    @Nested
    @DisplayName("Login Scenarios")
    class LoginTests {

        @Test
        @DisplayName("Successful login returns AuthResponse with access token")
        void login_success_returnsAuthResponse() {
            // Arrange
            LoginRequest request = new LoginRequest();
            request.setUsername("testuser");
            request.setPassword("correctPassword");

            when(loginAttemptRepository.countRecentFailedAttempts(anyString(), anyString(), any(LocalDateTime.class)))
                    .thenReturn(0L);
            when(userService.findByUsername("testuser")).thenReturn(Optional.of(testUser));
            when(passwordEncoder.matches("correctPassword", testUser.getPasswordHash())).thenReturn(true);
            when(personalWorkspaceRepository.existsByUser_UserId(1L)).thenReturn(true);
            when(companyMemberRepository.findByUser_UserIdAndIsActiveTrue(1L)).thenReturn(List.of());
            when(jwtService.generateToken(testUser)).thenReturn("mock-access-token");
            when(jwtService.generateRefreshToken(testUser)).thenReturn("mock-refresh-token");
            when(jwtService.getJwtExpiration()).thenReturn(3600000L);
            when(jwtService.getRefreshExpiration()).thenReturn(604800000L);
            when(refreshTokenRepository.findValidTokensByUser(eq(testUser), any(LocalDateTime.class)))
                    .thenReturn(List.of());

            // Act
            AuthResponse response = authService.login(request, TEST_IP, TEST_UA);

            // Assert
            assertNotNull(response);
            assertEquals("mock-access-token", response.getAccessToken());
            assertEquals("mock-refresh-token", response.getRefreshToken());
            assertEquals("Bearer", response.getTokenType());

            // Verify session was created
            verify(sessionService).createSession(testUser, TEST_IP, TEST_UA);
            // Verify user login status was updated
            verify(userService, atLeastOnce()).save(testUser);
        }

        @Test
        @DisplayName("Login with wrong password throws UnauthorizedException")
        void login_wrongPassword_throwsUnauthorized() {
            LoginRequest request = new LoginRequest();
            request.setUsername("testuser");
            request.setPassword("wrongPassword");

            when(loginAttemptRepository.countRecentFailedAttempts(anyString(), anyString(), any(LocalDateTime.class)))
                    .thenReturn(0L);
            when(userService.findByUsername("testuser")).thenReturn(Optional.of(testUser));
            when(passwordEncoder.matches("wrongPassword", testUser.getPasswordHash())).thenReturn(false);

            assertThrows(UnauthorizedException.class, () -> authService.login(request, TEST_IP, TEST_UA));

            // Verify failed attempt was recorded
            verify(loginAttemptRepository).save(any());
        }

        @Test
        @DisplayName("Login with null request throws BadRequestException")
        void login_nullRequest_throwsBadRequest() {
            assertThrows(BadRequestException.class, () -> authService.login(null, TEST_IP, TEST_UA));
        }

        @Test
        @DisplayName("Login with inactive user throws UnauthorizedException")
        void login_inactiveUser_throwsUnauthorized() {
            testUser.setIsActive(false);

            LoginRequest request = new LoginRequest();
            request.setUsername("testuser");
            request.setPassword("correctPassword");

            when(loginAttemptRepository.countRecentFailedAttempts(anyString(), anyString(), any(LocalDateTime.class)))
                    .thenReturn(0L);
            when(userService.findByUsername("testuser")).thenReturn(Optional.of(testUser));

            assertThrows(UnauthorizedException.class, () -> authService.login(request, TEST_IP, TEST_UA));
        }

        @Test
        @DisplayName("Login with non-existent user throws UnauthorizedException")
        void login_userNotFound_throwsUnauthorized() {
            LoginRequest request = new LoginRequest();
            request.setUsername("ghost");
            request.setPassword("any");

            when(loginAttemptRepository.countRecentFailedAttempts(anyString(), anyString(), any(LocalDateTime.class)))
                    .thenReturn(0L);
            when(userService.findByUsername("ghost")).thenReturn(Optional.empty());

            assertThrows(UnauthorizedException.class, () -> authService.login(request, TEST_IP, TEST_UA));
        }

        @Test
        @DisplayName("Login auto-selects company when user has exactly 1 membership")
        void login_singleCompany_autoSelectsCompany() {
            LoginRequest request = new LoginRequest();
            request.setUsername("testuser");
            request.setPassword("correctPassword");

            Company company = new Company();
            company.setCompanyId(10L);
            company.setName("TestCorp");
            company.setSlug("testcorp");

            CompanyMember membership = new CompanyMember();
            membership.setCompany(company);
            membership.setUser(testUser);
            membership.setRoles(new java.util.HashSet<>(Set.of(CompanyRole.ADMIN)));
            membership.setPermissions(null);

            when(loginAttemptRepository.countRecentFailedAttempts(anyString(), anyString(), any(LocalDateTime.class)))
                    .thenReturn(0L);
            when(userService.findByUsername("testuser")).thenReturn(Optional.of(testUser));
            when(passwordEncoder.matches("correctPassword", testUser.getPasswordHash())).thenReturn(true);
            when(personalWorkspaceRepository.existsByUser_UserId(1L)).thenReturn(true);
            when(companyMemberRepository.findByUser_UserIdAndIsActiveTrue(1L))
                    .thenReturn(List.of(membership));
            when(jwtService.generateToken(testUser, 10L, CompanyRole.ADMIN))
                    .thenReturn("mock-company-token");
            when(jwtService.generateRefreshToken(testUser)).thenReturn("mock-refresh");
            when(jwtService.getJwtExpiration()).thenReturn(3600000L);
            when(jwtService.getRefreshExpiration()).thenReturn(604800000L);
            when(refreshTokenRepository.findValidTokensByUser(eq(testUser), any(LocalDateTime.class)))
                    .thenReturn(List.of());

            AuthResponse response = authService.login(request, TEST_IP, TEST_UA);

            assertEquals(10L, response.getSelectedCompanyId());
            assertEquals("mock-company-token", response.getAccessToken());
        }

        @Test
        @DisplayName("Brute force lockout after max attempts")
        void login_bruteForce_throwsUnauthorized() {
            LoginRequest request = new LoginRequest();
            request.setUsername("testuser");
            request.setPassword("any");

            when(loginAttemptRepository.countRecentFailedAttempts(anyString(), anyString(), any(LocalDateTime.class)))
                    .thenReturn(5L); // maxLoginAttempts = 5
            // checkLoginAttempts internally calls findByUsername for security alert
            when(userService.findByUsername("testuser")).thenReturn(Optional.of(testUser));

            assertThrows(UnauthorizedException.class, () -> authService.login(request, TEST_IP, TEST_UA));

            // Password check should never be reached
            verify(passwordEncoder, never()).matches(anyString(), anyString());
        }
    }
    // REGISTER TESTS
    @Nested
    @DisplayName("Registration Scenarios")
    class RegisterTests {

        @Test
        @DisplayName("Successful registration returns AuthResponse")
        void register_success_returnsAuthResponse() {
            RegisterRequest request = new RegisterRequest();
            request.setEmail("new@user.com");
            request.setUsername("newuser");
            request.setPassword("securePass123");
            request.setPhoneNumber("0901234567");

            when(userService.findByEmail("new@user.com")).thenReturn(Optional.empty());
            when(userService.findByUsername("newuser")).thenReturn(Optional.empty());
            when(passwordEncoder.encode("securePass123")).thenReturn("$2a$10$encoded");
            when(userService.save(any(User.class))).thenAnswer(invocation -> {
                User saved = invocation.getArgument(0);
                saved.setUserId(99L);
                return saved;
            });
            when(jwtService.generateToken(any(User.class))).thenReturn("new-token");
            when(jwtService.generateRefreshToken(any(User.class))).thenReturn("new-refresh");
            when(jwtService.getJwtExpiration()).thenReturn(3600000L);
            when(jwtService.getRefreshExpiration()).thenReturn(604800000L);
            when(refreshTokenRepository.findValidTokensByUser(any(User.class), any(LocalDateTime.class)))
                    .thenReturn(List.of());

            AuthResponse response = authService.register(request, TEST_IP, TEST_UA);

            assertNotNull(response);
            assertEquals("new-token", response.getAccessToken());
            // Verify personal workspace was created
            verify(personalWorkspaceRepository).save(any(PersonalWorkspace.class));
            verify(sessionService).createSession(any(User.class), eq(TEST_IP), eq(TEST_UA));
        }

        @Test
        @DisplayName("Registration with duplicate email throws BadRequest")
        void register_duplicateEmail_throwsBadRequest() {
            RegisterRequest request = new RegisterRequest();
            request.setEmail("existing@user.com");
            request.setUsername("newuser");
            request.setPassword("pass");

            when(userService.findByEmail("existing@user.com")).thenReturn(Optional.of(testUser));

            assertThrows(BadRequestException.class, () -> authService.register(request, TEST_IP, TEST_UA));
        }

        @Test
        @DisplayName("Registration with duplicate username throws BadRequest")
        void register_duplicateUsername_throwsBadRequest() {
            RegisterRequest request = new RegisterRequest();
            request.setEmail("new@user.com");
            request.setUsername("testuser");
            request.setPassword("pass");

            when(userService.findByEmail("new@user.com")).thenReturn(Optional.empty());
            when(userService.findByUsername("testuser")).thenReturn(Optional.of(testUser));

            assertThrows(BadRequestException.class, () -> authService.register(request, TEST_IP, TEST_UA));
        }

        @Test
        @DisplayName("Registration with null request throws BadRequest")
        void register_nullRequest_throwsBadRequest() {
            assertThrows(BadRequestException.class, () -> authService.register(null, TEST_IP, TEST_UA));
        }
    }
    // CHANGE PASSWORD TESTS
    @Nested
    @DisplayName("Change Password Scenarios")
    class ChangePasswordTests {

        @Test
        @DisplayName("Change password with correct old password succeeds")
        void changePassword_success() {
            when(userService.findById(1L)).thenReturn(Optional.of(testUser));
            when(passwordEncoder.matches("oldPass", testUser.getPasswordHash())).thenReturn(true);
            when(passwordEncoder.matches("newPass", testUser.getPasswordHash())).thenReturn(false);
            when(passwordEncoder.encode("newPass")).thenReturn("$2a$10$newHash");

            assertDoesNotThrow(() -> authService.changePassword(1L, "oldPass", "newPass"));

            verify(userService).save(testUser);
            assertEquals("$2a$10$newHash", testUser.getPasswordHash());
        }

        @Test
        @DisplayName("Change password with wrong old password throws BadRequest")
        void changePassword_wrongOldPassword_throwsBadRequest() {
            when(userService.findById(1L)).thenReturn(Optional.of(testUser));
            when(passwordEncoder.matches("wrongOld", testUser.getPasswordHash())).thenReturn(false);

            assertThrows(BadRequestException.class, () -> authService.changePassword(1L, "wrongOld", "newPass"));
        }

        @Test
        @DisplayName("Change password to same password throws BadRequest")
        void changePassword_samePassword_throwsBadRequest() {
            when(userService.findById(1L)).thenReturn(Optional.of(testUser));
            when(passwordEncoder.matches("samePass", testUser.getPasswordHash())).thenReturn(true);

            assertThrows(BadRequestException.class, () -> authService.changePassword(1L, "samePass", "samePass"));
        }
    }
    // REFRESH TOKEN TESTS
    @Nested
    @DisplayName("Refresh Token Scenarios")
    class RefreshTokenTests {

        @Test
        @DisplayName("Valid refresh token returns new AuthResponse")
        void refreshToken_success() {
            RefreshToken storedToken = new RefreshToken();
            storedToken.setToken("valid-refresh");
            storedToken.setUser(testUser);
            storedToken.setExpiresAt(LocalDateTime.now().plusDays(7));
            storedToken.setIsRevoked(false);

            when(jwtService.validateToken("valid-refresh")).thenReturn(true);
            when(jwtService.isRefreshToken("valid-refresh")).thenReturn(true);
            when(refreshTokenRepository.findByToken("valid-refresh")).thenReturn(Optional.of(storedToken));
            when(companyMemberRepository.findByUser_UserIdAndIsActiveTrue(1L)).thenReturn(List.of());
            when(jwtService.generateToken(testUser)).thenReturn("new-access-token");
            when(jwtService.generateRefreshToken(testUser)).thenReturn("new-refresh-token");
            when(jwtService.getJwtExpiration()).thenReturn(3600000L);
            when(jwtService.getRefreshExpiration()).thenReturn(604800000L);
            when(refreshTokenRepository.findValidTokensByUser(eq(testUser), any(LocalDateTime.class)))
                    .thenReturn(List.of());

            AuthResponse response = authService.refreshToken("valid-refresh");

            assertNotNull(response);
            assertEquals("new-access-token", response.getAccessToken());
            // Verify old token was deleted (rotation)
            verify(refreshTokenRepository).delete(storedToken);
        }

        @Test
        @DisplayName("Blank refresh token throws UnauthorizedException")
        void refreshToken_blank_throwsUnauthorized() {
            assertThrows(UnauthorizedException.class, () -> authService.refreshToken(""));
        }

        @Test
        @DisplayName("Invalid JWT refresh token throws UnauthorizedException")
        void refreshToken_invalidJwt_throwsUnauthorized() {
            when(jwtService.validateToken("bad-token")).thenReturn(false);

            assertThrows(UnauthorizedException.class, () -> authService.refreshToken("bad-token"));
        }

        @Test
        @DisplayName("Revoked refresh token throws UnauthorizedException")
        void refreshToken_revoked_throwsUnauthorized() {
            RefreshToken revokedToken = new RefreshToken();
            revokedToken.setToken("revoked-refresh");
            revokedToken.setUser(testUser);
            revokedToken.setExpiresAt(LocalDateTime.now().minusDays(1)); // Expired
            revokedToken.setIsRevoked(true);

            when(jwtService.validateToken("revoked-refresh")).thenReturn(true);
            when(jwtService.isRefreshToken("revoked-refresh")).thenReturn(true);
            when(refreshTokenRepository.findByToken("revoked-refresh")).thenReturn(Optional.of(revokedToken));

            assertThrows(UnauthorizedException.class, () -> authService.refreshToken("revoked-refresh"));
        }
    }
    // LOGOUT TESTS
    @Nested
    @DisplayName("Logout Scenarios")
    class LogoutTests {

        @Test
        @DisplayName("Logout revokes refresh token and deactivates session")
        void logout_success() {
            RefreshToken token = new RefreshToken();
            token.setToken("refresh-to-revoke");
            token.setIsRevoked(false);

            when(refreshTokenRepository.findByToken("refresh-to-revoke")).thenReturn(Optional.of(token));

            authService.logout("refresh-to-revoke", "session-123");

            assertTrue(token.getIsRevoked());
            verify(refreshTokenRepository).save(token);
            verify(sessionService).deactivateSession("session-123");
        }

        @Test
        @DisplayName("Logout all devices revokes all tokens and sessions")
        void logoutAllDevices_success() {
            when(userService.getUserById(1L)).thenReturn(testUser);

            authService.logoutAllDevices(1L);

            verify(refreshTokenRepository).revokeAllTokensByUser(testUser);
            verify(sessionService).deactivateAllUserSessions(testUser);
            assertFalse(testUser.getIsOnline());
            verify(userService).save(testUser);
        }

        @Test
        @DisplayName("Logout all with null userId does nothing")
        void logoutAllDevices_nullId_noOp() {
            authService.logoutAllDevices(null);
            verifyNoInteractions(userService, refreshTokenRepository, sessionService);
        }
    }
    // VALIDATE TOKEN TEST
    @Nested
    @DisplayName("Token Validation")
    class ValidateTokenTests {

        @Test
        @DisplayName("Valid token returns true")
        void validateToken_valid_returnsTrue() {
            when(jwtService.validateToken("good-token")).thenReturn(true);
            assertTrue(authService.validateToken("good-token"));
        }

        @Test
        @DisplayName("Invalid token returns false")
        void validateToken_invalid_returnsFalse() {
            when(jwtService.validateToken("bad-token")).thenThrow(new RuntimeException("Expired"));
            assertFalse(authService.validateToken("bad-token"));
        }
    }
}
