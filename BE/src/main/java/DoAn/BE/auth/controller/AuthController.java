package DoAn.BE.auth.controller;

import DoAn.BE.auth.dto.AuthResponse;
import DoAn.BE.auth.dto.LoginRequest;
import DoAn.BE.auth.dto.RegisterRequest;
import DoAn.BE.auth.dto.SelectCompanyRequest;
import DoAn.BE.auth.service.AuthService;
import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.UnauthorizedException;
import DoAn.BE.user.entity.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    // Cookie Configuration
    private static final String REFRESH_TOKEN_COOKIE = "refreshToken";
    private static final int REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    private ResponseCookie createRefreshTokenCookie(String refreshToken) {
        return ResponseCookie.from(REFRESH_TOKEN_COOKIE, refreshToken)
                .httpOnly(true)
                .secure(true) // Use HTTPS in production
                .path("/api/auth")
                .maxAge(REFRESH_TOKEN_MAX_AGE)
                .sameSite("Strict")
                .build();
    }

    private ResponseCookie clearRefreshTokenCookie() {
        return ResponseCookie.from(REFRESH_TOKEN_COOKIE, "")
                .httpOnly(true)
                .secure(true)
                .path("/api/auth")
                .maxAge(0)
                .sameSite("Strict")
                .build();
    }

    // Đăng nhập - trả về token và set refreshToken cookie
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        try {
            String ipAddress = getClientIpAddress(httpRequest);
            String userAgent = httpRequest.getHeader("User-Agent");

            AuthResponse response = authService.login(request, ipAddress, userAgent);

            // Set refreshToken as httpOnly cookie
            ResponseCookie cookie = createRefreshTokenCookie(response.getRefreshToken());

            // Remove refreshToken from JSON response (keep only in cookie)
            response.setRefreshToken(null);

            return ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE, cookie.toString())
                    .body(response);
        } catch (Exception e) {
            throw new UnauthorizedException("Đăng nhập thất bại: " + e.getMessage());
        }
    }

    // [New] Đăng nhập bằng Google
    @PostMapping("/google")
    public ResponseEntity<AuthResponse> loginWithGoogle(
            @RequestBody Map<String, String> request,
            HttpServletRequest httpRequest) {
        try {
            String idToken = request.get("token");
            String ipAddress = getClientIpAddress(httpRequest);
            String userAgent = httpRequest.getHeader("User-Agent");

            AuthResponse response = authService.loginWithGoogle(idToken, ipAddress, userAgent);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            throw new UnauthorizedException("Google Login thất bại: " + e.getMessage());
        }
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse> getCurrentUser(@AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            throw new UnauthorizedException("Chưa đăng nhập");
        }
        // Tái sử dụng logic lấy info (không tạo token mới, chỉ lấy User & Membership)
        // Tuy nhiên AuthService.login trả về token, ở đây ta cần hàm build response từ
        // user.
        // Tạm thời gọi lại service để lấy full info (có thể optimize sau)
        // Hoặc đơn giản trả về AuthResponse dummy chỉ chứa User info
        AuthResponse response = authService.getCurrentUser(currentUser.getUserId());
        return ResponseEntity.ok(response);
    }

    // Đăng ký tài khoản mới - set refreshToken cookie
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest) {
        try {
            String ipAddress = getClientIpAddress(httpRequest);
            String userAgent = httpRequest.getHeader("User-Agent");

            AuthResponse response = authService.register(request, ipAddress, userAgent);

            ResponseCookie cookie = createRefreshTokenCookie(response.getRefreshToken());
            response.setRefreshToken(null);

            return ResponseEntity.status(HttpStatus.CREATED)
                    .header(HttpHeaders.SET_COOKIE, cookie.toString())
                    .body(response);
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            throw new BadRequestException("Đăng ký thất bại: " + e.getMessage());
        }
    }

    // Chọn công ty để làm việc - sinh token mới với companyId
    @PostMapping("/select-company")
    public ResponseEntity<AuthResponse> selectCompany(
            @Valid @RequestBody SelectCompanyRequest request,
            @AuthenticationPrincipal User currentUser,
            HttpServletRequest httpRequest) {
        if (currentUser == null) {
            throw new UnauthorizedException("Chưa đăng nhập");
        }
        String ipAddress = getClientIpAddress(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");

        AuthResponse response = authService.selectCompany(
                currentUser.getUserId(), request.getCompanyId(), ipAddress, userAgent);
        return ResponseEntity.ok(response);
    }

    // Refresh token - read from httpOnly cookie
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refreshToken(
            @CookieValue(name = REFRESH_TOKEN_COOKIE, required = false) String cookieRefreshToken,
            @RequestBody(required = false) Map<String, String> request) {
        try {
            // Priority: cookie > request body (backward compatibility)
            String refreshToken = cookieRefreshToken;
            if ((refreshToken == null || refreshToken.trim().isEmpty()) && request != null) {
                refreshToken = request.get("refreshToken");
            }

            if (refreshToken == null || refreshToken.trim().isEmpty()) {
                throw new BadRequestException("Refresh token không được để trống");
            }

            AuthResponse response = authService.refreshToken(refreshToken);

            // Set new refreshToken cookie
            ResponseCookie cookie = createRefreshTokenCookie(response.getRefreshToken());
            response.setRefreshToken(null);

            return ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE, cookie.toString())
                    .body(response);
        } catch (UnauthorizedException | BadRequestException e) {
            throw e;
        }
    }

    // Đăng xuất - clear cookie
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(
            @CookieValue(name = REFRESH_TOKEN_COOKIE, required = false) String cookieRefreshToken,
            @RequestBody(required = false) Map<String, String> request,
            HttpServletRequest httpRequest) {
        try {
            String refreshToken = cookieRefreshToken;
            if ((refreshToken == null || refreshToken.isEmpty()) && request != null) {
                refreshToken = request.get("refreshToken");
            }
            String sessionId = request != null ? request.get("sessionId") : null;

            authService.logout(refreshToken, sessionId);

            // Clear the refreshToken cookie
            ResponseCookie clearCookie = clearRefreshTokenCookie();

            Map<String, String> response = new HashMap<>();
            response.put("message", "Đăng xuất thành công");
            return ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE, clearCookie.toString())
                    .body(response);
        } catch (Exception e) {
            throw new BadRequestException("Đăng xuất thất bại: " + e.getMessage());
        }
    }

    // Đăng xuất tất cả thiết bị
    @PostMapping("/logout-all")
    public ResponseEntity<Map<String, String>> logoutAllDevices(@RequestParam Long userId) {
        try {
            authService.logoutAllDevices(userId);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Đăng xuất tất cả thiết bị thành công");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            throw new BadRequestException("Đăng xuất tất cả thiết bị thất bại: " + e.getMessage());
        }
    }

    // [System Admin] Đăng nhập dưới danh nghĩa User khác
    @PostMapping("/impersonate/{userId}")
    public ResponseEntity<AuthResponse> impersonateUser(
            @PathVariable Long userId,
            @AuthenticationPrincipal User currentUser,
            HttpServletRequest httpRequest) {
        if (currentUser == null) {
            throw new UnauthorizedException("Chưa đăng nhập");
        }

        String ipAddress = getClientIpAddress(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");

        AuthResponse response = authService.impersonateUser(currentUser.getUserId(), userId, ipAddress, userAgent);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/validate")
    public ResponseEntity<Map<String, Object>> validateToken(@RequestParam String token) {
        try {
            boolean valid = authService.validateToken(token);
            Map<String, Object> response = new HashMap<>();
            response.put("valid", valid);
            response.put("message", valid ? "Token hợp lệ" : "Token không hợp lệ");

            if (valid) {
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("valid", false);
            response.put("message", "Token không hợp lệ: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
    }

    // Quên mật khẩu - gửi email reset
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(
            @Valid @RequestBody DoAn.BE.auth.dto.ForgotPasswordRequest request) {
        authService.forgotPassword(request.getEmail());
        Map<String, String> response = new HashMap<>();
        response.put("message", "Đã gửi email hướng dẫn đặt lại mật khẩu");
        return ResponseEntity.ok(response);
    }

    // Reset mật khẩu với token
    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(
            @Valid @RequestBody DoAn.BE.auth.dto.ResetPasswordRequest request) {
        authService.resetPassword(request.getToken(), request.getNewPassword());
        Map<String, String> response = new HashMap<>();
        response.put("message", "Đặt lại mật khẩu thành công");
        return ResponseEntity.ok(response);
    }

    // Đổi mật khẩu khi đã login
    @PostMapping("/change-password")
    public ResponseEntity<Map<String, String>> changePassword(
            @Valid @RequestBody DoAn.BE.auth.dto.ChangePasswordRequest request,
            @AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            throw new UnauthorizedException("Chưa đăng nhập");
        }
        authService.changePassword(currentUser.getUserId(), request.getOldPassword(), request.getNewPassword());
        Map<String, String> response = new HashMap<>();
        response.put("message", "Đổi mật khẩu thành công");
        return ResponseEntity.ok(response);
    }

    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty() && !"unknown".equalsIgnoreCase(xForwardedFor)) {
            return xForwardedFor.split(",")[0].trim();
        }

        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty() && !"unknown".equalsIgnoreCase(xRealIp)) {
            return xRealIp;
        }

        return request.getRemoteAddr();
    }
}
