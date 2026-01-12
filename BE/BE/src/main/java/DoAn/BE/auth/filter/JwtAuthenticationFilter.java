package DoAn.BE.auth.filter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import DoAn.BE.auth.service.JwtService;
import DoAn.BE.auth.service.SessionService;
import DoAn.BE.common.context.TenantContext;
import DoAn.BE.user.entity.User;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import lombok.extern.slf4j.Slf4j;

// Filter xác thực JWT token và set TenantContext cho mỗi request
@Component
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final DoAn.BE.user.repository.UserRepository userRepository;
    @SuppressWarnings("unused") // Kept for session activity tracking (currently disabled)
    private final SessionService sessionService;

    public JwtAuthenticationFilter(JwtService jwtService, DoAn.BE.user.repository.UserRepository userRepository,
            SessionService sessionService) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.sessionService = sessionService;
    }

    @Override
    @SuppressWarnings({ "squid:S1181" })
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
            username = jwtService.extractUsername(jwt);

            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                log.debug("JWT Filter: Processing authentication for user: {}", username);
                User user = userRepository.findByUsername(username).orElse(null);

                if (user != null && jwtService.validateToken(jwt)) {

                    if (!user.getIsActive()) {
                        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        response.getWriter().write("{\"error\":\"Tài khoản đã bị vô hiệu hóa\"}");
                        return;
                    }

                    // Lấy companyId và role từ token
                    Long companyId = jwtService.getCompanyIdFromToken(jwt);
                    String role = jwtService.getRoleFromToken(jwt);

                    // Set TenantContext nếu có companyId trong token (header được xử lý bởi
                    // TenantFilter)
                    if (companyId != null && TenantContext.getCompanyId() == null) {
                        TenantContext.setCompanyId(companyId);
                    }

                    // Tạo authorities từ role trong token
                    List<SimpleGrantedAuthority> authorities = new ArrayList<>();

                    // [SAAS] System Admin gets special authority, bypassing company role checks
                    if (user.isSystemAdminAccount()) {
                        authorities.add(new SimpleGrantedAuthority("ROLE_SYSTEM_ADMIN"));
                        log.debug("Granted SYSTEM_ADMIN authority to user: {}", user.getUsername());
                    }

                    if (role != null && !role.isEmpty()) {
                        authorities.add(new SimpleGrantedAuthority("ROLE_" + role));
                    } else if (authorities.isEmpty()) {
                        // User chưa chọn company và không phải System Admin, cấp quyền cơ bản
                        authorities.add(new SimpleGrantedAuthority("ROLE_USER"));
                    }

                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            user, null, authorities);

                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);

                    // Cập nhật session activity
                    /*
                     * [DEBUG] Disabled to prevent lock contention
                     * String sessionId = request.getHeader("X-Session-ID");
                     * if (sessionId != null && !sessionId.trim().isEmpty()) {
                     * sessionService.updateSessionActivity(sessionId);
                     * }
                     */
                }
            }
        } catch (io.jsonwebtoken.ExpiredJwtException | io.jsonwebtoken.MalformedJwtException
                | io.jsonwebtoken.security.SignatureException | io.jsonwebtoken.UnsupportedJwtException
                | IllegalArgumentException e) {
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
        return path.startsWith("/api/auth/login") ||
                path.startsWith("/api/auth/register") ||
                path.startsWith("/api/auth/google") ||
                path.startsWith("/api/public/") ||
                path.equals("/error") ||
                path.startsWith("/actuator/") ||
                path.startsWith("/ws/");
    }
}
