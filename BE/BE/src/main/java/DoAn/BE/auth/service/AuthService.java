package DoAn.BE.auth.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import DoAn.BE.auth.dto.AuthResponse;
import DoAn.BE.auth.dto.LoginRequest;
import DoAn.BE.auth.entity.LoginAttempt;
import DoAn.BE.auth.entity.RefreshToken;
import DoAn.BE.auth.repository.LoginAttemptRepository;
import DoAn.BE.auth.repository.RefreshTokenRepository;
import DoAn.BE.common.exception.UnauthorizedException;
import DoAn.BE.notification.service.AuthNotificationService;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.service.UserService;

// Service xử lý authentication logic (login, logout, refresh token, brute force protection)
@Service
@Transactional
public class AuthService {

    private final UserService userService;
    private final JwtService jwtService;
    private final SessionService sessionService;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenRepository refreshTokenRepository;
    private final LoginAttemptRepository loginAttemptRepository;
    private final AuthNotificationService authNotificationService;

    private static final int MAX_LOGIN_ATTEMPTS = 5; // Khóa sau 5 lần thất bại
    private static final int LOCKOUT_DURATION_MINUTES = 15; // Khóa trong 15 phút

    public AuthService(UserService userService, JwtService jwtService, SessionService sessionService,
            PasswordEncoder passwordEncoder, RefreshTokenRepository refreshTokenRepository,
            LoginAttemptRepository loginAttemptRepository, AuthNotificationService authNotificationService) {
        this.userService = userService;
        this.jwtService = jwtService;
        this.sessionService = sessionService;
        this.passwordEncoder = passwordEncoder;
        this.refreshTokenRepository = refreshTokenRepository;
        this.loginAttemptRepository = loginAttemptRepository;
        this.authNotificationService = authNotificationService;
    }

    // Chức năng đăng ký đã bị vô hiệu hóa - Chỉ HR Manager có quyền tạo tài khoản

    /**
     * Đăng nhập - Generate JWT + Refresh token, tạo session, track login attempts
     */
    public AuthResponse login(LoginRequest request, String ipAddress, String userAgent) {
        // Kiểm tra brute force - Lock nếu quá 5 lần thất bại trong 15 phút
        checkLoginAttempts(request.getUsername(), ipAddress);

        // Tìm user
        User user = userService.findByUsername(request.getUsername())
                .orElseThrow(() -> new UnauthorizedException("Thông tin đăng nhập không chính xác"));

        // Kiểm tra user có active không
        if (!user.getIsActive()) {
            recordFailedLogin(request.getUsername(), ipAddress, "Tài khoản đã bị vô hiệu hóa");
            // 🔔 Thông báo tài khoản bị vô hiệu hóa
            try {
                authNotificationService.createSecurityAlertNotification(
                        user.getUserId(),
                        "Tài khoản đã bị vô hiệu hóa",
                        "Có người cố gắng đăng nhập vào tài khoản đã bị vô hiệu hóa từ IP: " + ipAddress);
            } catch (Exception e) {
                // Ignore notification errors
            }
            throw new UnauthorizedException("Tài khoản đã bị vô hiệu hóa");
        }

        // Kiểm tra password
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            recordFailedLogin(request.getUsername(), ipAddress, "Mật khẩu không chính xác");
            throw new UnauthorizedException("Thông tin đăng nhập không chính xác");
        }

        // Xóa failed attempts
        clearFailedAttempts(request.getUsername(), ipAddress);

        // Cập nhật last login
        user.setLastLogin(LocalDateTime.now());
        user.setIsOnline(true);
        userService.save(user);

        // Tạo session
        sessionService.createSession(user, ipAddress, userAgent);

        // Tạo tokens
        String accessToken = jwtService.generateToken(user);
        String refreshToken = createRefreshToken(user);

        // 🔔 Thông báo đăng nhập thành công - ĐÃ TẮT vì spam quá nhiều
        // try {
        // authNotificationService.createLoginSuccessNotification(
        // user.getUserId(),
        // ipAddress,
        // userAgent
        // );
        // } catch (Exception e) {
        // // Log error nhưng không fail login
        // }

        return buildAuthResponse(accessToken, refreshToken, user);
    }

    /**
     * Refresh token - Làm mới access token khi hết hạn (rotate refresh token)
     */
    public AuthResponse refreshToken(String refreshTokenString) {
        // Validate: Phải là refresh token hợp lệ (không phải access token)
        if (!jwtService.validateToken(refreshTokenString) || !jwtService.isRefreshToken(refreshTokenString)) {
            throw new UnauthorizedException("Refresh token không hợp lệ");
        }

        // Tìm refresh token trong database
        RefreshToken refreshToken = refreshTokenRepository.findByToken(refreshTokenString)
                .orElseThrow(() -> new UnauthorizedException("Refresh token không tồn tại"));

        if (!refreshToken.isValid()) {
            throw new UnauthorizedException("Refresh token đã hết hạn hoặc bị thu hồi");
        }

        User user = refreshToken.getUser();
        if (!user.getIsActive()) {
            throw new UnauthorizedException("Tài khoản đã bị vô hiệu hóa");
        }

        // Tạo access token mới
        String newAccessToken = jwtService.generateToken(user);

        // Tạo refresh token mới (rotate)
        refreshTokenRepository.delete(refreshToken);
        String newRefreshToken = createRefreshToken(user);

        // 🔔 Thông báo refresh token - ĐÃ TẮT vì spam quá nhiều
        // try {
        // authNotificationService.createInfoNotification(
        // user.getUserId(),
        // "Phiên đăng nhập đã được làm mới",
        // "Token của bạn đã được làm mới tự động."
        // );
        // } catch (Exception e) {
        // // Ignore notification errors
        // }

        return buildAuthResponse(newAccessToken, newRefreshToken, user);
    }

    /**
     * Đăng xuất - Revoke refresh token và deactivate session
     */
    public void logout(String refreshTokenString, String sessionId) {
        // Thu hồi refresh token
        if (refreshTokenString != null) {
            refreshTokenRepository.findByToken(refreshTokenString)
                    .ifPresent(token -> {
                        token.setIsRevoked(true);
                        refreshTokenRepository.save(token);
                    });
        }

        // Deactivate session
        if (sessionId != null) {
            sessionService.deactivateSession(sessionId);
        }
    }

    /**
     * Đăng xuất tất cả thiết bị - Revoke tất cả tokens và sessions
     */
    public void logoutAllDevices(Long userId) {
        User user = userService.getUserById(userId);

        // Revoke tất cả refresh tokens
        refreshTokenRepository.revokeAllTokensByUser(user);

        // Deactivate tất cả sessions
        sessionService.deactivateAllUserSessions(user);

        // Set user offline
        user.setIsOnline(false);
        userService.save(user);

        // 🔔 Gửi thông báo đăng xuất tất cả thiết bị
        try {
            authNotificationService.createSecurityAlertNotification(
                    userId,
                    "Đăng xuất tất cả thiết bị",
                    "Bạn đã đăng xuất khỏi tất cả thiết bị. Nếu không phải bạn thực hiện, vui lòng đổi mật khẩu ngay.");
        } catch (Exception e) {
            // Ignore notification errors
        }
    }

    // Tạo refresh token
    private String createRefreshToken(User user) {
        List<RefreshToken> existingTokens = refreshTokenRepository.findValidTokensByUser(user, LocalDateTime.now());
        if (existingTokens != null && !existingTokens.isEmpty()) {
            refreshTokenRepository.deleteAll(existingTokens);
        }
        String tokenString = jwtService.generateRefreshToken(user);

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setToken(tokenString);
        refreshToken.setUser(user);
        refreshToken.setExpiresAt(LocalDateTime.now().plusSeconds(jwtService.getRefreshExpiration() / 1000));
        refreshToken.setIsRevoked(false);

        refreshTokenRepository.save(refreshToken);

        return tokenString;
    }

    // Kiểm tra số lần đăng nhập thất bại
    private void checkLoginAttempts(String username, String ipAddress) {
        LocalDateTime cutoffTime = LocalDateTime.now().minusMinutes(LOCKOUT_DURATION_MINUTES);

        long recentAttempts = loginAttemptRepository.countRecentFailedAttempts(username, ipAddress, cutoffTime);

        if (recentAttempts >= MAX_LOGIN_ATTEMPTS) {
            // 🔔 Thông báo tài khoản bị khóa
            try {
                userService.findByUsername(username).ifPresent(user -> {
                    authNotificationService.createSecurityAlertNotification(
                            user.getUserId(),
                            "Tài khoản tạm thời bị khóa",
                            String.format(
                                    "Tài khoản của bạn đã bị khóa trong %d phút do đăng nhập sai %d lần liên tiếp từ IP: %s",
                                    LOCKOUT_DURATION_MINUTES, MAX_LOGIN_ATTEMPTS, ipAddress));
                });
            } catch (Exception e) {
                // Ignore notification errors
            }
            throw new UnauthorizedException("Tài khoản tạm thời bị khóa do đăng nhập sai quá nhiều lần");
        }
    }

    // Ghi lại login thất bại
    private void recordFailedLogin(String username, String ipAddress, String reason) {
        LoginAttempt attempt = new LoginAttempt();
        attempt.setUsername(username);
        attempt.setIpAddress(ipAddress);
        attempt.setAttemptedAt(LocalDateTime.now());
        attempt.setSuccess(false);
        attempt.setFailureReason(reason);

        loginAttemptRepository.save(attempt);
    }

    // Xóa các lần thử thất bại
    private void clearFailedAttempts(String username, String ipAddress) {
        loginAttemptRepository.deleteByUsernameAndIpAddress(username, ipAddress);
    }

    // Xây dựng AuthResponse
    private AuthResponse buildAuthResponse(String accessToken, String refreshToken, User user) {
        AuthResponse response = new AuthResponse();
        response.setAccessToken(accessToken);
        response.setRefreshToken(refreshToken);
        response.setTokenType("Bearer");
        response.setExpiresIn(jwtService.getJwtExpiration() / 1000); // Convert to seconds

        AuthResponse.UserInfo userInfo = new AuthResponse.UserInfo();
        userInfo.setUserId(user.getUserId());
        userInfo.setUsername(user.getUsername());
        userInfo.setEmail(user.getEmail());
        userInfo.setRole(user.getRole());
        userInfo.setIsActive(user.getIsActive());

        response.setUser(userInfo);
        return response;
    }

    // Validate token
    public boolean validateToken(String token) {
        try {
            return jwtService.validateToken(token);
        } catch (Exception e) {
            return false;
        }
    }
}
