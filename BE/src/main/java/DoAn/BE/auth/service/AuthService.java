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
    private final org.springframework.web.reactive.function.client.WebClient webClient;
    private final DoAn.BE.user.repository.PersonalWorkspaceRepository personalWorkspaceRepository;
    private final int maxLoginAttempts;
    private final int lockoutDurationMinutes;
    private final String googleTokenInfoUrl;
    private final String defaultAvatarUrlPattern; // Configurable Avatar URL

    public AuthService(@org.springframework.context.annotation.Lazy UserService userService, JwtService jwtService,
            @org.springframework.context.annotation.Lazy SessionService sessionService,
            PasswordEncoder passwordEncoder, RefreshTokenRepository refreshTokenRepository,
            LoginAttemptRepository loginAttemptRepository,
            org.springframework.context.ApplicationEventPublisher eventPublisher,
            CompanyMemberRepository companyMemberRepository,
            DoAn.BE.audit.service.AuditLogService auditLogService,
            org.springframework.web.reactive.function.client.WebClient.Builder webClientBuilder,
            DoAn.BE.user.repository.PersonalWorkspaceRepository personalWorkspaceRepository,
            @org.springframework.beans.factory.annotation.Value("${app.security.login.max-attempts:5}") int maxLoginAttempts,
            @org.springframework.beans.factory.annotation.Value("${app.security.login.lockout-minutes:15}") int lockoutDurationMinutes,
            @org.springframework.beans.factory.annotation.Value("${app.security.google.token-info-url:https://oauth2.googleapis.com/tokeninfo}") String googleTokenInfoUrl,
            @org.springframework.beans.factory.annotation.Value("${app.user.default-avatar-url:https://ui-avatars.com/api/?name=%s&background=random&color=fff&size=128}") String defaultAvatarUrlPattern) {
        this.userService = userService;
        this.jwtService = jwtService;
        this.sessionService = sessionService;
        this.passwordEncoder = passwordEncoder;
        this.refreshTokenRepository = refreshTokenRepository;
        this.loginAttemptRepository = loginAttemptRepository;
        this.eventPublisher = eventPublisher;
        this.companyMemberRepository = companyMemberRepository;
        this.auditLogService = auditLogService;
        this.webClient = webClientBuilder.build();
        this.personalWorkspaceRepository = personalWorkspaceRepository;
        this.maxLoginAttempts = maxLoginAttempts;
        this.lockoutDurationMinutes = lockoutDurationMinutes;
        this.googleTokenInfoUrl = googleTokenInfoUrl;
        this.defaultAvatarUrlPattern = defaultAvatarUrlPattern;
    }
    @Transactional
    public AuthResponse login(LoginRequest request, String ipAddress, String userAgent) {
        if (request == null || request.getUsername() == null || request.getPassword() == null) {
            throw new BadRequestException("Thông tin đăng nhập không được để trống");
        }
        checkLoginAttempts(request.getUsername(), ipAddress);
        User user = userService.findByUsername(request.getUsername())
                .orElseThrow(() -> new UnauthorizedException("Thông tin đăng nhập không chính xác"));
        validateUserActive(user, request.getUsername(), ipAddress);
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            recordFailedLogin(request.getUsername(), ipAddress, "Mật khẩu không chính xác");
            throw new UnauthorizedException("Thông tin đăng nhập không chính xác");
        }
        clearFailedAttempts(request.getUsername(), ipAddress);
        updateUserLoginStatus(user);

        // [MIGRATION] Đảm bảo user cũ có Personal Workspace (Role: Create)
        if (!personalWorkspaceRepository.existsByUser_UserId(user.getUserId())) {
            DoAn.BE.user.entity.PersonalWorkspace pw = DoAn.BE.user.entity.PersonalWorkspace.createFor(user);
            personalWorkspaceRepository.save(pw);
            log.info("Đã tạo Personal Workspace cho user cũ: {}", user.getUsername());
        }
        sessionService.createSession(user, ipAddress, userAgent);
        List<CompanyMember> memberships = companyMemberRepository.findByUser_UserIdAndIsActiveTrue(user.getUserId());
        // [FIX] Nếu user chỉ có 1 company, tự động include companyId và role vào token
        String accessToken;
        Long selectedCompanyId = null;
        if (memberships.size() == 1) {
            CompanyMember singleMember = memberships.get(0);
            selectedCompanyId = singleMember.getCompany().getCompanyId();
            // [Fix] Use first role or primary role logic. For now, sending the first role
            // found.
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
        String newAccessToken = jwtService.generateToken(user);
        refreshTokenRepository.delete(refreshToken);
        String newRefreshToken = createRefreshToken(user);

        return buildAuthResponse(newAccessToken, newRefreshToken, user, memberships, null);
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

    // [Đăng nhập bằng Google] (Role: All)
    // PERFORMANCE OPTIMIZATION: verifyGoogleToken (External API) được gọi TRƯỚC khi
    // mở Transaction.
    // Điều này ngăn chặn việc giữ Connection DB trong khi chờ Google phản hồi (có
    // thể mất vài giây).
    // /
    public AuthResponse loginWithGoogle(String idToken, String ipAddress, String userAgent) {
        if (idToken == null || idToken.isBlank()) {
            throw new BadRequestException("Google ID token không được để trống");
        }

        // 1. [Verify Token với Google] - NON-TRANSACTIONAL (Network Call)
        // Calling external API before any DB transaction to avoid connection holding
        java.util.Map<String, Object> googleUser = verifyGoogleToken(idToken);

        String email = (String) googleUser.get("email");
        String picture = (String) googleUser.get("picture");

        // 2. [Process DB Logic]
        return processGoogleLoginTransactional(email, picture, ipAddress, userAgent);
    }
    @Transactional
    public AuthResponse impersonateUser(Long adminUserId, Long targetUserId, String ipAddress, String userAgent) {
        // ... (giữ nguyên logic)
        User admin = userService.getUserById(adminUserId);
        if (!Boolean.TRUE.equals(admin.isSystemAdminAccount())) {
            throw new UnauthorizedException("Chỉ System Admin mới có quyền thực hiện thao tác này");
        }
        User targetUser = userService.getUserById(targetUserId);

        auditLogService.logAction(
                admin,
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
        if (userService.findByUsername(request.getUsername()).isPresent()) {
            throw new BadRequestException("Username đã tồn tại");
        }
        User newUser = new User();
        newUser.setEmail(request.getEmail());
        newUser.setUsername(request.getUsername());
        newUser.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        newUser.setPhoneNumber(request.getPhoneNumber());
        newUser.setIsActive(true);
        newUser.setStatus(User.UserStatus.ACTIVE);

        // Set avatar mặc định (Configurable)
        String avatarUrl = String.format(defaultAvatarUrlPattern, request.getUsername().replace(" ", "+"));
        newUser.setAvatarUrl(avatarUrl);

        newUser = userService.save(newUser);
        log.info("Đã tạo tài khoản mới: {}", newUser.getUsername());
        DoAn.BE.user.entity.PersonalWorkspace personalWorkspace = DoAn.BE.user.entity.PersonalWorkspace
                .createFor(newUser);
        personalWorkspaceRepository.save(personalWorkspace);
        log.info("Đã tạo Personal Workspace cho user: {}", newUser.getUsername());
        updateUserLoginStatus(newUser);
        sessionService.createSession(newUser, ipAddress, userAgent);
        List<CompanyMember> memberships = List.of();
        String accessToken = jwtService.generateToken(newUser);
        String refreshToken = createRefreshToken(newUser);

        return buildAuthResponse(accessToken, refreshToken, newUser, memberships, null);
    }

    private AuthResponse processGoogleLoginTransactional(String email, String picture, String ipAddress,
            String userAgent) {
        // [Note] This private method is called from inside loginWithGoogle (which has
        // no Transaction)
        // We rely on underlying Repository transactions for each operation.
        // For stricter consistency, a TransactionTemplate or Self-Injection pattern
        // could be used.
        User user = userService.findByEmail(email).orElseGet(() -> createGoogleUser(email, picture));

        if (!user.getIsActive()) {
            throw new UnauthorizedException("Tài khoản đã bị vô hiệu hóa");
        }
        updateUserLoginStatus(user);
        sessionService.createSession(user, ipAddress, userAgent);
        List<CompanyMember> memberships = companyMemberRepository.findByUser_UserIdAndIsActiveTrue(user.getUserId());
        String accessToken = jwtService.generateToken(user);
        String refreshToken = createRefreshToken(user);

        return buildAuthResponse(accessToken, refreshToken, user, memberships, null);
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
        DoAn.BE.user.entity.PersonalWorkspace personalWorkspace = DoAn.BE.user.entity.PersonalWorkspace
                .createFor(newUser);
        personalWorkspaceRepository.save(personalWorkspace);
        log.info("Đã tạo Personal Workspace cho Google user: {}", newUser.getEmail());

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
        userInfo.setIsSystemAdmin(user.isSystemAdminAccount()); // [SAAS] System Admin flag
        userInfo.setPersonalPlan(user.getPersonalPlan()); // [NEW] Personal plan
        response.setUser(userInfo);
        personalWorkspaceRepository.findByUser_UserId(user.getUserId())
                .ifPresent(pw -> {
                    AuthResponse.PersonalWorkspaceInfo pwInfo = new AuthResponse.PersonalWorkspaceInfo();
                    pwInfo.setWorkspaceId(pw.getWorkspaceId());
                    pwInfo.setName(pw.getName());
                    pwInfo.setPlan(user.getPersonalPlan());
                    response.setPersonalWorkspace(pwInfo);
                });
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
    public void forgotPassword(String email) {
        User user = userService.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("Email không tồn tại trong hệ thống"));

        // Tạo token reset
        String resetToken = java.util.UUID.randomUUID().toString();
        user.setResetPasswordToken(resetToken);
        user.setResetPasswordTokenExpiry(LocalDateTime.now().plusHours(1)); // Token hết hạn sau 1 giờ
        userService.save(user);

        // Gửi email thông báo (sử dụng AuthNotificationService)
        // Publish Event
        eventPublisher.publishEvent(new DoAn.BE.auth.event.AuthEvent(
                this,
                DoAn.BE.auth.event.AuthEvent.Type.PASSWORD_RESET_REQUESTED,
                user.getUserId(),
                user.getUsername(),
                "Password Reset Requested",
                "Reset Token: " + resetToken));

        log.info("Sent password reset email to: {}", email);
    }
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
        attempt.setAttemptedAt(LocalDateTime.now());
        attempt.setSuccess(false);
        attempt.setFailureReason(reason);
        loginAttemptRepository.save(attempt);
    }
    private void clearFailedAttempts(String username, String ipAddress) {
        loginAttemptRepository.deleteByUsernameAndIpAddress(username, ipAddress);
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
}
