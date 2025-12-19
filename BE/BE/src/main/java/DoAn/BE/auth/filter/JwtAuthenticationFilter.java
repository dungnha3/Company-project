package DoAn.BE.auth.filter;

import java.io.IOException;
import java.util.Collections;

import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import DoAn.BE.auth.service.JwtService;
import DoAn.BE.auth.service.SessionService;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.service.UserService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

// Filter xác thực JWT token cho mỗi request (trừ public endpoints)
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserService userService;
    private final SessionService sessionService;

    public JwtAuthenticationFilter(JwtService jwtService, UserService userService, SessionService sessionService) {
        this.jwtService = jwtService;
        this.userService = userService;
        this.sessionService = sessionService;
    }

    @Override
    @SuppressWarnings({"squid:S1181", "squid:S1181"}) // JWT validation requires generic exception handling
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String username;

        // Kiểm tra Authorization header
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Extract JWT token
        jwt = authHeader.substring(7);

        try {
            // Extract username từ JWT
            username = jwtService.extractUsername(jwt);

            // Kiểm tra username và SecurityContext
            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {

                // Tìm user trong database
                User user = userService.findByUsername(username)
                        .orElse(null);

                if (user != null && jwtService.validateToken(jwt)) {

                    // Kiểm tra user có active không
                    if (!user.getIsActive()) {
                        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        response.getWriter().write("{\"error\":\"Tài khoản đã bị vô hiệu hóa\"}");
                        return;
                    }

                    // Tạo authentication token với User object làm principal
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            user, // Set User object làm principal
                            null,
                            Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
                    );

                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);

                    // Cập nhật session activity (nếu có sessionId trong header)
                    String sessionId = request.getHeader("X-Session-ID");
                    if (sessionId != null && !sessionId.trim().isEmpty()) {
                        sessionService.updateSessionActivity(sessionId);
                    }
                }
            }
        } catch (io.jsonwebtoken.ExpiredJwtException |
                 io.jsonwebtoken.MalformedJwtException |
                 io.jsonwebtoken.security.SignatureException |
                 io.jsonwebtoken.UnsupportedJwtException |
                 IllegalArgumentException e) {
            logger.warn("JWT validation failed: " + e.getMessage());
            SecurityContextHolder.clearContext();
        } catch (RuntimeException e) {
            logger.error("Unexpected error during JWT validation: " + e.getMessage());
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) throws ServletException {
        String path = request.getRequestURI();

        // Không filter các endpoint public
        return path.startsWith("/api/auth/") ||
               path.startsWith("/api/public/") ||
               path.equals("/error") ||
               path.startsWith("/actuator/");
    }
}
