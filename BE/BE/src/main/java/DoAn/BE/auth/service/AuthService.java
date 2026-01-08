package DoAn.BE.auth.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import DoAn.BE.auth.dto.AuthResponse;
import DoAn.BE.auth.dto.LoginRequest;
import DoAn.BE.auth.dto.RegisterRequest;
import DoAn.BE.auth.entity.LoginAttempt;
import DoAn.BE.auth.entity.RefreshToken;
import DoAn.BE.auth.repository.LoginAttemptRepository;
import DoAn.BE.auth.repository.RefreshTokenRepository;
import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.UnauthorizedException;
import DoAn.BE.company.entity.CompanyMember;
import DoAn.BE.company.repository.CompanyMemberRepository;
import DoAn.BE.notification.service.AuthNotificationService;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.service.UserService;
import lombok.extern.slf4j.Slf4j;

// [Service xử lý authentication] (Role: System)
@Service
@Transactional
@Slf4j
public class AuthService {

    private final UserService userService;
    private final JwtService jwtService;
    private final SessionService sessionService;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenRepository refreshTokenRepository;
    private final LoginAttemptRepository loginAttemptRepository;
    private final AuthNotificationService authNotificationService;
    private final CompanyMemberRepository companyMemberRepository;
    private final org.springframework.web.reactive.function.client.WebClient webClient;

    // [Cấu hình bảo vệ brute force] (Role: Config)
    private final int maxLoginAttempts;
    private final int lockoutDurationMinutes;
    private final String googleTokenInfoUrl;

    public AuthService(UserService userService, JwtService jwtService, SessionService sessionService,
            PasswordEncoder passwordEncoder, RefreshTokenRepository refreshTokenRepository,
            LoginAttemptRepository loginAttemptRepository, AuthNotificationService authNotificationService,
            CompanyMemberRepository companyMemberRepository,
            org.springframework.web.reactive.function.client.WebClient.Builder webClientBuilder,
            @org.springframework.beans.factory.annotation.Value("${app.security.login.max-attempts:5}") int maxLoginAttempts,
            @org.springframework.beans.factory.annotation.Value("${app.security.login.lockout-minutes:15}") int lockoutDurationMinutes,
            @org.springframework.beans.factory.annotation.Value("${app.security.google.token-info-url:https://oauth2.googleapis.com/tokeninfo}") String googleTokenInfoUrl) {
        this.userService = userService;
        this.jwtService = jwtService;
        this.sessionService = sessionService;
        this.passwordEncoder = passwordEncoder;
        this.refreshTokenRepository = refreshTokenRepository;
        this.loginAttemptRepository = loginAttemptRepository;
        this.authNotificationService = authNotificationService;
        this.companyMemberRepository = companyMemberRepository;
        this.webClient = webClientBuilder.build();
        this.maxLoginAttempts = maxLoginAttempts;
        this.lockoutDurationMinutes = lockoutDurationMinutes;
        this.googleTokenInfoUrl = googleTokenInfoUrl;
    }

    // [Đăng nhập - Generate JWT + Refresh token] (Role: All)
    public AuthResponse login(LoginRequest request, String ipAddress, String userAgent) {
        // [Validate input] (Role: Guard)
        if (request == null || request.getUsername() == null || request.getPassword() == null) {
            throw new BadRequestException("Thông tin đăng nhập không được để trống");
        }

        // [Kiểm tra brute force] (Role: Security)
        checkLoginAttempts(request.getUsername(), ipAddress);

        // [Tìm user] (Role: Query)
        User user = userService.findByUsername(request.getUsername())
                .orElseThrow(() -> new UnauthorizedException("Thông tin đăng nhập không chính xác"));

        // [Kiểm tra user active] (Role: Validation)
        validateUserActive(user, request.getUsername(), ipAddress);

        // [Kiểm tra password] (Role: Security)
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            recordFailedLogin(request.getUsername(), ipAddress, "Mật khẩu không chính xác");
            throw new UnauthorizedException("Thông tin đăng nhập không chính xác");
        }

        // [Xóa failed attempts sau đăng nhập thành công] (Role: Cleanup)
        clearFailedAttempts(request.getUsername(), ipAddress);

        // [Cập nhật trạng thái user] (Role: Update)
        updateUserLoginStatus(user);

        // [Tạo session] (Role: Session)
        sessionService.createSession(user, ipAddress, userAgent);

        // [Lấy danh sách công ty] (Role: Query)
        List<CompanyMember> memberships = companyMemberRepository.findByUser_UserIdAndIsActiveTrue(user.getUserId());

        // [Tạo tokens] (Role: Token)
        // [FIX] Nếu user chỉ có 1 company, tự động include companyId và role vào token
        String accessToken;
        Long selectedCompanyId = null;
        if (memberships.size() == 1) {
            CompanyMember singleMember = memberships.get(0);
            selectedCompanyId = singleMember.getCompany().getCompanyId();
            accessToken = jwtService.generateToken(user, selectedCompanyId, singleMember.getRole());
            log.info("User {} auto-selected company {} with role {}",
                    user.getUsername(), singleMember.getCompany().getName(), singleMember.getRole());
        } else {
            accessToken = jwtService.generateToken(user);
        }
        String refreshToken = createRefreshToken(user);

        return buildAuthResponse(accessToken, refreshToken, user, memberships, selectedCompanyId);
    }

    // [Chọn công ty để làm việc] (Role: Authenticated User)
    public AuthResponse selectCompany(Long userId, Long companyId, String ipAddress, String userAgent) {
        // [Validate input] (Role: Guard)
        if (userId == null || companyId == null) {
            throw new BadRequestException("userId và companyId không được để trống");
        }

        User user = userService.getUserById(userId);

        // [Kiểm tra quyền truy cập công ty] (Role: Authorization)
        CompanyMember member = companyMemberRepository
                .findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(userId, companyId)
                .orElseThrow(() -> new UnauthorizedException("Bạn không có quyền truy cập công ty này"));

        log.info("User {} đã chọn công ty {} với vai trò {}",
                user.getUsername(), member.getCompany().getName(), member.getRole());

        // [Lấy danh sách công ty] (Role: Query)
        List<CompanyMember> memberships = companyMemberRepository.findByUser_UserIdAndIsActiveTrue(userId);

        // [Tạo token mới với companyId và role] (Role: Token)
        String accessToken = jwtService.generateToken(user, companyId, member.getRole());
        String refreshToken = createRefreshToken(user);

        return buildAuthResponse(accessToken, refreshToken, user, memberships, companyId);
    }

    // [Làm mới access token] (Role: Authenticated User)
    public AuthResponse refreshToken(String refreshTokenString) {
        // [Validate token] (Role: Guard)
        if (refreshTokenString == null || refreshTokenString.isBlank()) {
            throw new UnauthorizedException("Refresh token không được để trống");
        }

        if (!jwtService.validateToken(refreshTokenString) || !jwtService.isRefreshToken(refreshTokenString)) {
            throw new UnauthorizedException("Refresh token không hợp lệ");
        }

        RefreshToken refreshToken = refreshTokenRepository.findByToken(refreshTokenString)
                .orElseThrow(() -> new UnauthorizedException("Refresh token không tồn tại"));

        if (!refreshToken.isValid()) {
            throw new UnauthorizedException("Refresh token đã hết hạn hoặc bị thu hồi");
        }

        User user = refreshToken.getUser();
        if (!user.getIsActive()) {
            throw new UnauthorizedException("Tài khoản đã bị vô hiệu hóa");
        }

        // [Lấy danh sách công ty] (Role: Query)
        List<CompanyMember> memberships = companyMemberRepository.findByUser_UserIdAndIsActiveTrue(user.getUserId());

        // [Tạo access token mới] (Role: Token)
        String newAccessToken = jwtService.generateToken(user);

        // [Rotate refresh token] (Role: Security)
        refreshTokenRepository.delete(refreshToken);
        String newRefreshToken = createRefreshToken(user);

        return buildAuthResponse(newAccessToken, newRefreshToken, user, memberships, null);
    }

    // [Đăng xuất] (Role: Authenticated User)
    public void logout(String refreshTokenString, String sessionId) {
        if (refreshTokenString != null) {
            refreshTokenRepository.findByToken(refreshTokenString)
                    .ifPresent(token -> {
                        token.setIsRevoked(true);
                        refreshTokenRepository.save(token);
                    });
        }
        if (sessionId != null) {
            sessionService.deactivateSession(sessionId);
        }
    }

    // [Đăng xuất tất cả thiết bị] (Role: Authenticated User)
    public void logoutAllDevices(Long userId) {
        if (userId == null) {
            return;
        }

        User user = userService.getUserById(userId);
        refreshTokenRepository.revokeAllTokensByUser(user);
        sessionService.deactivateAllUserSessions(user);
        user.setIsOnline(false);
        userService.save(user);

        sendSecurityAlert(userId, "Đăng xuất tất cả thiết bị",
                "Bạn đã đăng xuất khỏi tất cả thiết bị.");
    }

    // [Đăng nhập bằng Google] (Role: All)
    public AuthResponse loginWithGoogle(String idToken, String ipAddress, String userAgent) {
        // [Validate input] (Role: Guard)
        if (idToken == null || idToken.isBlank()) {
            throw new BadRequestException("Google ID token không được để trống");
        }

        // [Verify Token với Google] (Role: External API)
        java.util.Map<String, Object> googleUser = verifyGoogleToken(idToken);

        String email = (String) googleUser.get("email");
        String picture = (String) googleUser.get("picture");

        // [Tìm hoặc tạo user] (Role: Upsert)
        User user = userService.findByEmail(email).orElseGet(() -> createGoogleUser(email, picture));

        if (!user.getIsActive()) {
            throw new UnauthorizedException("Tài khoản đã bị vô hiệu hóa");
        }

        // [Cập nhật trạng thái] (Role: Update)
        updateUserLoginStatus(user);

        // [Tạo session] (Role: Session)
        sessionService.createSession(user, ipAddress, userAgent);

        // [Lấy danh sách công ty] (Role: Query)
        List<CompanyMember> memberships = companyMemberRepository.findByUser_UserIdAndIsActiveTrue(user.getUserId());

        // [Tạo tokens] (Role: Token)
        String accessToken = jwtService.generateToken(user);
        String refreshToken = createRefreshToken(user);

        return buildAuthResponse(accessToken, refreshToken, user, memberships, null);
    }

    public boolean validateToken(String token) {
        try {
            return jwtService.validateToken(token);
        } catch (Exception e) {
            return false;
        }
    }

    // [Đăng ký tài khoản thủ công] (Role: All)
    public AuthResponse register(RegisterRequest request, String ipAddress, String userAgent) {
        // [Validate input] (Role: Guard)
        if (request == null) {
            throw new BadRequestException("Thông tin đăng ký không được để trống");
        }

        // [Kiểm tra email đã tồn tại] (Role: Validation)
        if (userService.findByEmail(request.getEmail()).isPresent()) {
            throw new BadRequestException("Email đã được sử dụng");
        }

        // [Kiểm tra username đã tồn tại] (Role: Validation)
        if (userService.findByUsername(request.getUsername()).isPresent()) {
            throw new BadRequestException("Username đã tồn tại");
        }

        // [Tạo user mới] (Role: Create)
        User newUser = new User();
        newUser.setEmail(request.getEmail());
        newUser.setUsername(request.getUsername());
        newUser.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        newUser.setPhoneNumber(request.getPhoneNumber());
        newUser.setIsActive(true);
        newUser.setStatus(User.UserStatus.ACTIVE);

        // Set avatar mặc định
        String avatarUrl = "https://ui-avatars.com/api/?name=" +
                request.getUsername().replace(" ", "+") +
                "&background=random&color=fff&size=128";
        newUser.setAvatarUrl(avatarUrl);

        newUser = userService.save(newUser);
        log.info("Đã tạo tài khoản mới: {}", newUser.getUsername());

        // [Cập nhật trạng thái login] (Role: Update)
        updateUserLoginStatus(newUser);

        // [Tạo session] (Role: Session)
        sessionService.createSession(newUser, ipAddress, userAgent);

        // [User mới chưa thuộc công ty nào] (Role: Query)
        List<CompanyMember> memberships = List.of();

        // [Tạo tokens] (Role: Token)
        String accessToken = jwtService.generateToken(newUser);
        String refreshToken = createRefreshToken(newUser);

        return buildAuthResponse(accessToken, refreshToken, newUser, memberships, null);
    }

    // ==================== PRIVATE METHODS ====================

    // [Kiểm tra user active] (Role: Internal)
    private void validateUserActive(User user, String username, String ipAddress) {
        if (!user.getIsActive()) {
            recordFailedLogin(username, ipAddress, "Tài khoản đã bị vô hiệu hóa");
            sendSecurityAlert(user.getUserId(), "Tài khoản đã bị vô hiệu hóa",
                    "Có người cố gắng đăng nhập vào tài khoản đã bị vô hiệu hóa từ IP: " + ipAddress);
            throw new UnauthorizedException("Tài khoản đã bị vô hiệu hóa");
        }
    }

    // [Cập nhật trạng thái login của user] (Role: Internal)
    private void updateUserLoginStatus(User user) {
        user.setLastLogin(LocalDateTime.now());
        user.setIsOnline(true);
        userService.save(user);
    }

    // [Tạo refresh token] (Role: Internal)
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

    // [Kiểm tra số lần đăng nhập thất bại] (Role: Security)
    private void checkLoginAttempts(String username, String ipAddress) {
        LocalDateTime cutoffTime = LocalDateTime.now().minusMinutes(this.lockoutDurationMinutes);
        long recentAttempts = loginAttemptRepository.countRecentFailedAttempts(username, ipAddress, cutoffTime);

        if (recentAttempts >= this.maxLoginAttempts) {
            userService.findByUsername(username)
                    .ifPresent(user -> sendSecurityAlert(user.getUserId(), "Tài khoản tạm thời bị khóa",
                            String.format("Tài khoản bị khóa %d phút do đăng nhập sai %d lần từ IP: %s",
                                    this.lockoutDurationMinutes, this.maxLoginAttempts, ipAddress)));
            throw new UnauthorizedException("Tài khoản tạm thời bị khóa do đăng nhập sai quá nhiều lần");
        }
    }

    // [Ghi lại login thất bại] (Role: Logging)
    private void recordFailedLogin(String username, String ipAddress, String reason) {
        LoginAttempt attempt = new LoginAttempt();
        attempt.setUsername(username);
        attempt.setIpAddress(ipAddress);
        attempt.setAttemptedAt(LocalDateTime.now());
        attempt.setSuccess(false);
        attempt.setFailureReason(reason);
        loginAttemptRepository.save(attempt);
    }

    // [Xóa các lần thử thất bại] (Role: Cleanup)
    private void clearFailedAttempts(String username, String ipAddress) {
        loginAttemptRepository.deleteByUsernameAndIpAddress(username, ipAddress);
    }

    // [Gửi cảnh báo bảo mật] (Role: Notification)
    private void sendSecurityAlert(Long userId, String title, String message) {
        try {
            authNotificationService.createSecurityAlertNotification(userId, title, message);
        } catch (Exception e) {
            log.warn("Không thể gửi cảnh báo bảo mật: {}", e.getMessage());
        }
    }

    // [Xác thực Google token] (Role: External API)
    // Note: This method blocks the main thread. High-throughput scenarios should
    // use WebFlux or @Async.
    private java.util.Map<String, Object> verifyGoogleToken(String idToken) {
        java.util.Map<String, Object> googleUser = webClient.get()
                .uri(this.googleTokenInfoUrl + "?id_token=" + idToken)
                .retrieve()
                .bodyToMono(new org.springframework.core.ParameterizedTypeReference<java.util.Map<String, Object>>() {
                })
                .block();

        if (googleUser == null || googleUser.get("email") == null) {
            throw new BadRequestException("Google token không hợp lệ");
        }
        return googleUser;
    }

    // [Tạo user từ Google login] (Role: Create)
    private User createGoogleUser(String email, String picture) {
        User newUser = new User();
        newUser.setEmail(email);
        newUser.setUsername(email);
        newUser.setPasswordHash(passwordEncoder.encode(java.util.UUID.randomUUID().toString()));
        newUser.setIsActive(true);
        newUser.setStatus(User.UserStatus.ACTIVE);
        newUser.setAvatarUrl(picture);
        return userService.save(newUser);
    }

    // [Xây dựng AuthResponse] (Role: DTO Builder)
    private AuthResponse buildAuthResponse(String accessToken, String refreshToken, User user,
            List<CompanyMember> memberships, Long selectedCompanyId) {
        AuthResponse response = new AuthResponse();
        response.setAccessToken(accessToken);
        response.setRefreshToken(refreshToken);
        response.setTokenType("Bearer");
        response.setExpiresIn(jwtService.getJwtExpiration() / 1000);
        response.setSelectedCompanyId(selectedCompanyId);

        // [Build User info] (Role: DTO)
        AuthResponse.UserInfo userInfo = new AuthResponse.UserInfo();
        userInfo.setUserId(user.getUserId());
        userInfo.setUsername(user.getUsername());
        userInfo.setEmail(user.getEmail());
        userInfo.setIsActive(user.getIsActive());
        userInfo.setIsSystemAdmin(user.isSystemAdminAccount()); // [SAAS] System Admin flag
        response.setUser(userInfo);

        // [Build Companies list] (Role: DTO)
        List<AuthResponse.CompanyDTO> companies = memberships.stream()
                .map(m -> new AuthResponse.CompanyDTO(
                        m.getCompany().getCompanyId(),
                        m.getCompany().getName(),
                        m.getCompany().getSlug(),
                        m.getRole(),
                        m.getCompany().getLogoUrl()))
                .collect(Collectors.toList());
        response.setCompanies(companies);

        return response;
    }

    // [Quên mật khẩu - Gửi email reset] (Role: All)
    public void forgotPassword(String email) {
        User user = userService.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("Email không tồn tại trong hệ thống"));

        // Tạo token reset
        String resetToken = java.util.UUID.randomUUID().toString();
        user.setResetPasswordToken(resetToken);
        user.setResetPasswordTokenExpiry(LocalDateTime.now().plusHours(1)); // Token hết hạn sau 1 giờ
        userService.save(user);

        // Gửi email thông báo (sử dụng AuthNotificationService)
        authNotificationService.sendPasswordResetNotification(
                user.getUserId(),
                "Reset Token: " + resetToken); // Thực tế nên gửi link chứa token

        log.info("Sent password reset email to: {}", email);
    }

    // [Reset mật khẩu với token] (Role: All)
    public void resetPassword(String token, String newPassword) {
        User user = userService.findByResetPasswordToken(token)
                .orElseThrow(() -> new BadRequestException("Token không hợp lệ hoặc đã hết hạn"));

        // Kiểm tra token còn hạn không
        if (user.getResetPasswordTokenExpiry() == null ||
                user.getResetPasswordTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Token đã hết hạn. Vui lòng yêu cầu reset mật khẩu mới.");
        }

        // Đổi mật khẩu
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setResetPasswordToken(null);
        user.setResetPasswordTokenExpiry(null);
        userService.save(user);

        // Revoke tất cả refresh token (bảo mật)
        refreshTokenRepository.revokeAllTokensByUser(user);

        log.info("Password reset successful for user: {}", user.getUsername());
    }

    // [Đổi mật khẩu khi đã login] (Role: Authenticated User)
    public void changePassword(Long userId, String oldPassword, String newPassword) {
        User user = userService.findById(userId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy người dùng"));

        // Verify mật khẩu cũ
        if (!passwordEncoder.matches(oldPassword, user.getPasswordHash())) {
            throw new BadRequestException("Mật khẩu cũ không chính xác");
        }

        // Không cho phép đặt mật khẩu mới giống mật khẩu cũ
        if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
            throw new BadRequestException("Mật khẩu mới không được giống mật khẩu cũ");
        }

        // Đổi mật khẩu
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userService.save(user);

        // Gửi thông báo bảo mật
        sendSecurityAlert(userId, "Đổi mật khẩu", "Mật khẩu tài khoản của bạn đã được thay đổi");

        log.info("Password changed for user: {}", user.getUsername());
    }
}
