package DoAn.BE.auth.controller;

import DoAn.BE.auth.dto.AuthResponse;
import DoAn.BE.auth.dto.LoginRequest;
import DoAn.BE.auth.service.AuthService;
import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.UnauthorizedException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

// Controller xử lý authentication (login, logout, refresh token, validate)
@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    // Chức năng đăng ký đã bị vô hiệu hóa - Chỉ HR Manager có quyền tạo tài khoản mới

    // Đăng nhập
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        try {
            String ipAddress = getClientIpAddress(httpRequest);
            String userAgent = httpRequest.getHeader("User-Agent");
            
            AuthResponse response = authService.login(request, ipAddress, userAgent);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            throw new UnauthorizedException("Đăng nhập thất bại: " + e.getMessage());
        }
    }

    // Refresh token
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refreshToken(@RequestBody Map<String, String> request) {
        try {
            String refreshToken = request.get("refreshToken");
            if (refreshToken == null || refreshToken.trim().isEmpty()) {
                throw new BadRequestException("Refresh token không được để trống");
            }
            
            AuthResponse response = authService.refreshToken(refreshToken);
            return ResponseEntity.ok(response);
        } catch (UnauthorizedException | BadRequestException e) {
            throw e;
        }
    }

    // Đăng xuất
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(
            @RequestBody(required = false) Map<String, String> request,
            HttpServletRequest httpRequest) {
        try {
            String refreshToken = request != null ? request.get("refreshToken") : null;
            String sessionId = request != null ? request.get("sessionId") : null;
            
            authService.logout(refreshToken, sessionId);
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "Đăng xuất thành công");
            return ResponseEntity.ok(response);
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

    // Kiểm tra token có hợp lệ không
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

    // Lấy thông tin client IP address
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
