package DoAn.BE.auth.controller;

import DoAn.BE.auth.dto.AuthResponse;
import DoAn.BE.auth.dto.GoogleLoginRequest;
import DoAn.BE.auth.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class GoogleAuthController {

    private final AuthService authService;

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> googleLogin(@Valid @RequestBody GoogleLoginRequest request,
            HttpServletRequest httpRequest) {
        String ipAddress = httpRequest.getRemoteAddr();
        String userAgent = httpRequest.getHeader("User-Agent");
        AuthResponse response = authService.loginWithGoogle(request.getIdToken(), ipAddress, userAgent);
        return ResponseEntity.ok(response);
    }
}
