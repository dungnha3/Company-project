package DoAn.BE.auth.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
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
import DoAn.BE.company.entity.CompanyRole;
import DoAn.BE.company.repository.CompanyMemberRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.service.UserService;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class AuthService {

    private final UserService userService;
    private final JwtService jwtService;
    private final SessionService sessionService;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenRepository refreshTokenRepository;
    private final LoginAttemptRepository loginAttemptRepository;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;
    private final CompanyMemberRepository companyMemberRepository;
    private final DoAn.BE.audit.service.AuditLogService auditLogService;
    private final org.springframework.web.client.RestTemplate restTemplate;

    private final TwoFactorService twoFactorService;
    private final int maxLoginAttempts;
    private final int lockoutDurationMinutes;
    private final String googleTokenInfoUrl;
    private final String googleClientId; // [SECURITY] Required for audience verification
    private final String defaultAvatarUrlPattern; // Configurable Avatar URL
    private final org.springframework.transaction.PlatformTransactionManager transactionManager;

    public AuthService(@org.springframework.context.annotation.Lazy UserService userService, JwtService jwtService,
            @org.springframework.context.annotation.Lazy SessionService sessionService,
            PasswordEncoder passwordEncoder, RefreshTokenRepository refreshTokenRepository,
            LoginAttemptRepository loginAttemptRepository,
            org.springframework.context.ApplicationEventPublisher eventPublisher,
            CompanyMemberRepository companyMemberRepository,
            DoAn.BE.audit.service.AuditLogService auditLogService,
            org.springframework.boot.web.client.RestTemplateBuilder restTemplateBuilder,
            TwoFactorService twoFactorService,
            @org.springframework.beans.factory.annotation.Value("${app.security.login.max-attempts:5}") int maxLoginAttempts,
            @org.springframework.beans.factory.annotation.Value("${app.security.login.lockout-minutes:15}") int lockoutDurationMinutes,
            @org.springframework.beans.factory.annotation.Value("${app.security.google.token-info-url:https://oauth2.googleapis.com/tokeninfo}") String googleTokenInfoUrl,
            @org.springframework.beans.factory.annotation.Value("${app.security.google.client-id:}") String googleClientId,
            @org.springframework.beans.factory.annotation.Value("${app.user.default-avatar-url:https://ui-avatars.com/api/?name=%s&background=random&color=fff&size=128}") String defaultAvatarUrlPattern,
            org.springframework.transaction.PlatformTransactionManager transactionManager) {
        this.userService = userService;
        this.jwtService = jwtService;
        this.sessionService = sessionService;
        this.passwordEncoder = passwordEncoder;
        this.refreshTokenRepository = refreshTokenRepository;
        this.loginAttemptRepository = loginAttemptRepository;
        this.eventPublisher = eventPublisher;
        this.companyMemberRepository = companyMemberRepository;
        this.auditLogService = auditLogService;
        this.restTemplate = restTemplateBuilder.build();
        this.twoFactorService = twoFactorService;
        this.maxLoginAttempts = maxLoginAttempts;
        this.lockoutDurationMinutes = lockoutDurationMinutes;
        this.googleTokenInfoUrl = googleTokenInfoUrl;
        this.googleClientId = googleClientId;
        this.defaultAvatarUrlPattern = defaultAvatarUrlPattern;
        this.transactionManager = transactionManager;
    }

    @Transactional
    public AuthResponse login(LoginRequest request, String ipAddress, String userAgent) {
        if (request == null || request.getEmail() == null || request.getPassword() == null) {
            throw new BadRequestException("Thông tin đăng nhập không được để trống");
        }
        checkLoginAttempts(request.getEmail(), ipAddress);
        User user = userService.findByEmail(request.getEmail())
                .orElseThrow(() -> new UnauthorizedException("Thông tin đăng nhập không chính xác"));
        validateUserActive(user, request.getEmail(), ipAddress);
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            recordFailedLogin(request.getEmail(), ipAddress, "Mật khẩu không chính xác");
            throw new UnauthorizedException("Thông tin đăng nhập không chính xác");
        }

        // 2FA check — if enabled, return partial response requiring TOTP code
        if (Boolean.TRUE.equals(user.getTwoFactorEnabled())) {
            clearFailedAttempts(request.getEmail(), ipAddress);
            String tempToken = jwtService.generateTempToken(user);
            AuthResponse twoFactorResponse = new AuthResponse();
            twoFactorResponse.setRequiresTwoFactor(true);
            twoFactorResponse.setTempToken(tempToken);
            return twoFactorResponse;
        }

        clearFailedAttempts(request.getEmail(), ipAddress);
        updateUserLoginStatus(user);

        sessionService.createSession(user, ipAddress, userAgent);
        List<CompanyMember> memberships = companyMemberRepository.findByUser_UserIdAndIsActiveTrue(user.getUserId());

        String accessToken;
        Long selectedCompanyId = null;
        if (memberships.size() == 1) {
            CompanyMember singleMember = memberships.get(0);
            selectedCompanyId = singleMember.getCompany().getCompanyId();
            CompanyRole primaryRole = singleMember.getRoles().stream().findFirst()
                    .orElse(DoAn.BE.company.entity.CompanyRole.EMPLOYEE);
            accessToken = jwtService.generateToken(user, selectedCompanyId, primaryRole);
            log.info("User {} auto-selected company {} with role {}",
                    user.getUsername(), singleMember.getCompany().getName(), primaryRole);
        } else {
            accessToken = jwtService.generateToken(user);
        }
        String refreshToken = createRefreshToken(user);

        return buildAuthResponse(accessToken, refreshToken, user, memberships, selectedCompanyId);
    }

    @Transactional
    public AuthResponse verify2fa(String tempToken, String code, String ipAddress, String userAgent) {
        if (tempToken == null || code == null) {
            throw new BadRequestException("Token và mã xác thực không được để trống");
        }

        // Validate temp token
        if (!jwtService.validateToken(tempToken)) {
            throw new UnauthorizedException("Token tạm đã hết hạn. Vui lòng đăng nhập lại.");
        }

        io.jsonwebtoken.Claims claims = jwtService.extractClaim(tempToken, c -> c);
        if (!"2fa_temp".equals(claims.get("type"))) {
            throw new UnauthorizedException("Token không hợp lệ");
        }

        Long userId = claims.get("userId", Long.class);
        User user = userService.getUserById(userId);

        // Verify TOTP code or backup code
        boolean verified = twoFactorService.verifyCode(user.getTwoFactorSecret(), code);

        // If TOTP fails, try backup code
        if (!verified && user.getTwoFactorBackupCodes() != null) {
            String remainingCodes = twoFactorService.verifyBackupCode(user.getTwoFactorBackupCodes(), code);
            if (remainingCodes != null) {
                verified = true;
                user.setTwoFactorBackupCodes(remainingCodes);
                userService.save(user);
                log.info("User {} used a backup code for 2FA", user.getUsername());
            }
        }

        if (!verified) {
            throw new UnauthorizedException("Mã xác thực không đúng");
        }

        // Complete login flow
        updateUserLoginStatus(user);
        sessionService.createSession(user, ipAddress, userAgent);
        List<CompanyMember> memberships = companyMemberRepository.findByUser_UserIdAndIsActiveTrue(user.getUserId());

        String accessToken;
        Long selectedCompanyId = null;
        if (memberships.size() == 1) {
            CompanyMember singleMember = memberships.get(0);
            selectedCompanyId = singleMember.getCompany().getCompanyId();
            CompanyRole primaryRole = singleMember.getRoles().stream().findFirst()
                    .orElse(CompanyRole.EMPLOYEE);
            accessToken = jwtService.generateToken(user, selectedCompanyId, primaryRole);
        } else {
            accessToken = jwtService.generateToken(user);
        }
        String refreshToken = createRefreshToken(user);

        return buildAuthResponse(accessToken, refreshToken, user, memberships, selectedCompanyId);
    }

    @Transactional(readOnly = true)
    public AuthResponse getCurrentUser(Long userId) {
        User user = userService.getUserById(userId);
        List<CompanyMember> memberships = companyMemberRepository.findByUser_UserIdAndIsActiveTrue(userId);
        // Build AuthResponse mà không cần issue token mới
        return buildAuthResponse(null, null, user, memberships, null);
    }

    @Transactional
    public AuthResponse selectCompany(Long userId, Long companyId, String ipAddress, String userAgent) {
        if (userId == null || companyId == null) {
            throw new BadRequestException("userId và companyId không được để trống");
        }

        User user = userService.getUserById(userId);
        CompanyMember member = companyMemberRepository
                .findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(userId, companyId)
                .orElseThrow(() -> new UnauthorizedException("Bạn không có quyền truy cập công ty này"));

        log.info("User {} đã chọn công ty {} với vai trò {}",
                user.getUsername(), member.getCompany().getName(), member.getRoles());
        List<CompanyMember> memberships = companyMemberRepository.findByUser_UserIdAndIsActiveTrue(userId);
        CompanyRole primaryRole = member.getRoles().stream().findFirst()
                .orElse(DoAn.BE.company.entity.CompanyRole.EMPLOYEE);
        String accessToken = jwtService.generateToken(user, companyId, primaryRole);
        String refreshToken = createRefreshToken(user);

        return buildAuthResponse(accessToken, refreshToken, user, memberships, companyId);
    }

    @Transactional
    public AuthResponse refreshToken(String refreshTokenString) {
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
        List<CompanyMember> memberships = companyMemberRepository.findByUser_UserIdAndIsActiveTrue(user.getUserId());
        String newAccessToken;
        Long selectedCompanyId = null;
        if (memberships.size() == 1) {
            CompanyMember singleMember = memberships.get(0);
            selectedCompanyId = singleMember.getCompany().getCompanyId();
            CompanyRole primaryRole = singleMember.getRoles().stream().findFirst()
                    .orElse(CompanyRole.EMPLOYEE);
            newAccessToken = jwtService.generateToken(user, selectedCompanyId, primaryRole);
        } else {
            newAccessToken = jwtService.generateToken(user);
        }

        refreshTokenRepository.delete(refreshToken);
        String newRefreshToken = createRefreshToken(user);

        return buildAuthResponse(newAccessToken, newRefreshToken, user, memberships, selectedCompanyId);
    }

    @Transactional
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

    @Transactional
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

    public AuthResponse loginWithGoogle(String idToken, String ipAddress, String userAgent) {
        if (idToken == null || idToken.isBlank()) {
            throw new BadRequestException("Google ID token không được để trống");
        }

        java.util.Map<String, Object> googleUser = verifyGoogleToken(idToken);

        String email = (String) googleUser.get("email");
        Object emailVerified = googleUser.get("email_verified");
        if (!"true".equals(String.valueOf(emailVerified))) {
            throw new BadRequestException("Email Google chưa được xác minh");
        }
        String picture = (String) googleUser.get("picture");

        return processGoogleLoginTransactional(email, picture, ipAddress, userAgent);
    }

    @Transactional
    public AuthResponse impersonateUser(Long adminUserId, Long targetUserId, String ipAddress, String userAgent) {
        User admin = userService.getUserById(adminUserId);
        if (!Boolean.TRUE.equals(admin.isSystemAdminAccount())) {
            throw new UnauthorizedException("Chỉ System Admin mới có quyền thực hiện thao tác này");
        }
        User targetUser = userService.getUserById(targetUserId);

        auditLogService.logAction(
                admin.getUserId(),
                "IMPERSONATE_USER",
                "AUTH",
                targetUser.getUserId(),
                java.util.Map.of("adminId", admin.getUserId()),
                java.util.Map.of("targetUser", targetUser.getUsername(), "reason", "Support Debugging"),
                DoAn.BE.audit.entity.AuditLog.Severity.WARNING,
                ipAddress,
                userAgent);
        log.warn("AUDIT: System Admin {} is impersonating user {}", admin.getUsername(), targetUser.getUsername());

        sessionService.createSession(targetUser, ipAddress, userAgent);

        List<CompanyMember> memberships = companyMemberRepository
                .findByUser_UserIdAndIsActiveTrue(targetUser.getUserId());

        String accessToken;
        Long selectedCompanyId = null;
        if (memberships.size() == 1) {
            CompanyMember singleMember = memberships.get(0);
            selectedCompanyId = singleMember.getCompany().getCompanyId();
            CompanyRole primaryRole = singleMember.getRoles().stream().findFirst()
                    .orElse(DoAn.BE.company.entity.CompanyRole.EMPLOYEE);
            accessToken = jwtService.generateToken(targetUser, selectedCompanyId, primaryRole);
        } else {
            accessToken = jwtService.generateToken(targetUser);
        }
        String refreshToken = createRefreshToken(targetUser);
        return buildAuthResponse(accessToken, refreshToken, targetUser, memberships, selectedCompanyId);
    }

    public boolean validateToken(String token) {
        try {
            return jwtService.validateToken(token);
        } catch (Exception e) {
            return false;
        }
    }

    @Transactional
    public AuthResponse register(RegisterRequest request, String ipAddress, String userAgent) {
        if (request == null) {
            throw new BadRequestException("Thông tin đăng ký không được để trống");
        }
        if (userService.findByEmail(request.getEmail()).isPresent()) {
            throw new BadRequestException("Email đã được sử dụng");
        }
        
        User newUser = new User();
        newUser.setEmail(request.getEmail());
        newUser.setUsername(request.getEmail());
        newUser.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        newUser.setPhoneNumber(request.getPhoneNumber());
        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            newUser.setFullName(request.getFullName().trim());
        }
        newUser.setIsActive(true);
        newUser.setStatus(User.UserStatus.ACTIVE);

        // Set avatar mặc định (Configurable)
        String avatarUrl = String.format(defaultAvatarUrlPattern, request.getEmail().replace(" ", "+"));
        newUser.setAvatarUrl(avatarUrl);

        newUser = userService.save(newUser);
        log.info("Đã tạo tài khoản mới: {}", newUser.getUsername());
        updateUserLoginStatus(newUser);
        sessionService.createSession(newUser, ipAddress, userAgent);
        List<CompanyMember> memberships = List.of();
        String accessToken = jwtService.generateToken(newUser);
        String refreshToken = createRefreshToken(newUser);

        return buildAuthResponse(accessToken, refreshToken, newUser, memberships, null);
    }

    private AuthResponse processGoogleLoginTransactional(String email, String picture, String ipAddress,
            String userAgent) {
        org.springframework.transaction.support.TransactionTemplate txTemplate = new org.springframework.transaction.support.TransactionTemplate(
                transactionManager);
        return txTemplate.execute(status -> {
            User user = userService.findByEmail(email).orElseGet(() -> createGoogleUser(email, picture));

            // Shadow user (PENDING_ACTIVATION) đăng nhập Google lần đầu → kích hoạt
            if (!user.getIsActive()) {
                if (user.getStatus() == User.UserStatus.PENDING_ACTIVATION) {
                    user.setIsActive(true);
                    user.setStatus(User.UserStatus.ACTIVE);
                    if (picture != null && (user.getAvatarUrl() == null || user.getAvatarUrl().isBlank())) {
                        user.setAvatarUrl(picture);
                    }
                    userService.save(user);
                    log.info("Đã kích hoạt shadow user {} qua Google Login", user.getEmail());
                } else {
                    throw new UnauthorizedException("Tài khoản đã bị vô hiệu hóa");
                }
            }
            updateUserLoginStatus(user);
            sessionService.createSession(user, ipAddress, userAgent);
            List<CompanyMember> memberships = companyMemberRepository
                    .findByUser_UserIdAndIsActiveTrue(user.getUserId());
            String accessToken;
            Long selectedCompanyId = null;
            if (memberships.size() == 1) {
                CompanyMember singleMember = memberships.get(0);
                selectedCompanyId = singleMember.getCompany().getCompanyId();
                CompanyRole primaryRole = singleMember.getRoles().stream().findFirst()
                        .orElse(CompanyRole.EMPLOYEE);
                accessToken = jwtService.generateToken(user, selectedCompanyId, primaryRole);
            } else {
                accessToken = jwtService.generateToken(user);
            }
            String refreshToken = createRefreshToken(user);

            return buildAuthResponse(accessToken, refreshToken, user, memberships, selectedCompanyId);
        });
    }

    private User createGoogleUser(String email, String picture) {
        User newUser = new User();
        newUser.setEmail(email);
        newUser.setUsername(email);
        newUser.setPasswordHash(passwordEncoder.encode(java.util.UUID.randomUUID().toString()));
        newUser.setIsActive(true);
        newUser.setStatus(User.UserStatus.ACTIVE);
        newUser.setAvatarUrl(picture);
        newUser = userService.save(newUser);

        return newUser;
    }

    private AuthResponse buildAuthResponse(String accessToken, String refreshToken, User user,
            List<CompanyMember> memberships, Long selectedCompanyId) {
        AuthResponse response = new AuthResponse();
        response.setAccessToken(accessToken);
        response.setRefreshToken(refreshToken);
        response.setTokenType("Bearer");
        response.setExpiresIn(jwtService.getJwtExpiration() / 1000);
        response.setSelectedCompanyId(selectedCompanyId);
        AuthResponse.UserInfo userInfo = new AuthResponse.UserInfo();
        userInfo.setUserId(user.getUserId());
        userInfo.setUsername(user.getUsername());
        userInfo.setEmail(user.getEmail());
        userInfo.setIsActive(user.getIsActive());
        userInfo.setIsSystemAdmin(user.isSystemAdminAccount());
        userInfo.setTwoFactorEnabled(Boolean.TRUE.equals(user.getTwoFactorEnabled()));
        response.setUser(userInfo);
        List<AuthResponse.CompanyDTO> companies = memberships.stream()
                .map(m -> new AuthResponse.CompanyDTO(
                        m.getCompany().getCompanyId(),
                        m.getCompany().getName(),
                        m.getCompany().getSlug(),
                        m.getRoles().stream().findFirst().orElse(DoAn.BE.company.entity.CompanyRole.EMPLOYEE),
                        m.getPermissions(),
                        m.getCompany().getLogoUrl()))
                .collect(Collectors.toList());
        response.setCompanies(companies);

        return response;
    }

    @Transactional
    public void forgotPassword(String email) {
        Optional<User> userOpt = userService.findByEmail(email);
        if (userOpt.isEmpty()) {
            log.info("Password reset requested for non-existent email: {}", email);
            return;
        }
        User user = userOpt.get();

        String resetToken = java.util.UUID.randomUUID().toString();
        user.setResetPasswordToken(resetToken);
        user.setResetPasswordTokenExpiry(LocalDateTime.now().plusHours(1));
        userService.save(user);

        eventPublisher.publishEvent(new DoAn.BE.auth.event.AuthEvent(
                this,
                DoAn.BE.auth.event.AuthEvent.Type.PASSWORD_RESET_REQUESTED,
                user.getUserId(),
                user.getUsername(),
                "Password Reset Requested",
                null));

        log.info("Sent password reset email to: {}", email);
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        User user = userService.findByResetPasswordToken(token)
                .orElseThrow(() -> new BadRequestException("Token không hợp lệ hoặc đã hết hạn"));

        if (user.getResetPasswordTokenExpiry() == null ||
                user.getResetPasswordTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Token đã hết hạn. Vui lòng yêu cầu reset mật khẩu mới.");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setResetPasswordToken(null);
        user.setResetPasswordTokenExpiry(null);
        userService.save(user);

        refreshTokenRepository.revokeAllTokensByUser(user);

        log.info("Password reset successful for user: {}", user.getUsername());
    }

    @Transactional
    public void changePassword(Long userId, String oldPassword, String newPassword) {
        User user = userService.findById(userId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy người dùng"));

        if (!passwordEncoder.matches(oldPassword, user.getPasswordHash())) {
            throw new BadRequestException("Mật khẩu cũ không chính xác");
        }

        if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
            throw new BadRequestException("Mật khẩu mới không được giống mật khẩu cũ");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userService.save(user);

        sendSecurityAlert(userId, "Đổi mật khẩu", "Mật khẩu tài khoản của bạn đã được thay đổi");

        log.info("Password changed for user: {}", user.getUsername());
    }

    private void validateUserActive(User user, String username, String ipAddress) {
        if (!user.getIsActive()) {
            recordFailedLogin(username, ipAddress, "Tài khoản đã bị vô hiệu hóa");
            sendSecurityAlert(user.getUserId(), "Tài khoản đã bị vô hiệu hóa",
                    "Có người cố gắng đăng nhập vào tài khoản đã bị vô hiệu hóa từ IP: " + ipAddress);
            throw new UnauthorizedException("Tài khoản đã bị vô hiệu hóa");
        }
    }

    private void updateUserLoginStatus(User user) {
        user.setLastLogin(LocalDateTime.now());
        user.setIsOnline(true);
        userService.save(user);
    }

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

    private void recordFailedLogin(String username, String ipAddress, String reason) {
        LoginAttempt attempt = new LoginAttempt();
        attempt.setUsername(username);
        attempt.setIpAddress(ipAddress);
        attempt.setSuccess(false);
        attempt.setFailureReason(reason);
        loginAttemptRepository.save(attempt);
    }

    private void clearFailedAttempts(String username, String ipAddress) {
        LoginAttempt successAttempt = new LoginAttempt();
        successAttempt.setUsername(username);
        successAttempt.setIpAddress(ipAddress);
        successAttempt.setSuccess(true);
        successAttempt.setFailureReason(null);
        loginAttemptRepository.save(successAttempt);
        loginAttemptRepository.deleteByUsernameAndIpAddressAndSuccessFalse(username, ipAddress);
    }

    private void sendSecurityAlert(Long userId, String title, String message) {
        try {
            eventPublisher.publishEvent(new DoAn.BE.auth.event.AuthEvent(
                    this,
                    DoAn.BE.auth.event.AuthEvent.Type.SECURITY_ALERT,
                    userId,
                    null, // username not always available here easily without lookup, but ok to be null
                          // if mostly for ID-based notification
                    title,
                    message));
        } catch (Exception e) {
            log.warn("Không thể gửi cảnh báo bảo mật: {}", e.getMessage());
        }
    }

    private java.util.Map<String, Object> verifyGoogleToken(String idToken) {
        java.util.Map<String, Object> googleUser = restTemplate.exchange(
                this.googleTokenInfoUrl + "?id_token=" + idToken,
                org.springframework.http.HttpMethod.GET,
                null,
                new org.springframework.core.ParameterizedTypeReference<java.util.Map<String, Object>>() {}
        ).getBody();

        if (googleUser == null || googleUser.get("email") == null) {
            throw new BadRequestException("Google token không hợp lệ");
        }
        String audience = (String) googleUser.get("aud");
        if (this.googleClientId == null || this.googleClientId.isBlank()) {
            log.warn("Google Client ID not configured — audience verification SKIPPED. "
                    + "Set app.security.google.client-id to enable audience verification.");
        } else if (!this.googleClientId.equals(audience)) {
            log.warn("Google token audience mismatch: expected={}, actual={}", this.googleClientId, audience);
            throw new UnauthorizedException("Google token không hợp lệ cho ứng dụng này");
        }

        return googleUser;
    }
}
