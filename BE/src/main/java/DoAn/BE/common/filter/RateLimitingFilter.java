package DoAn.BE.common.filter;

import DoAn.BE.common.service.RateLimitingService;
import DoAn.BE.common.service.RateLimitingService.RateLimitType;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

// Rate Limiting Filter
// Applies rate limiting based on client IP and endpoint type
//
// Order: Runs early in filter chain (before authentication)
// /
@Component
@Order(1)
@RequiredArgsConstructor
@Slf4j
public class RateLimitingFilter extends OncePerRequestFilter {

    private final RateLimitingService rateLimitingService;

    @Value("${rate.limit.enabled:true}")
    private boolean enabled;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String clientIp = extractClientIp(request);
        String path = request.getRequestURI();

        RateLimitType limitType = determineRateLimitType(path);

        if (!rateLimitingService.tryConsume(clientIp, limitType)) {
            log.warn("Rate limit exceeded for IP: {} on path: {}", clientIp, path);

            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"error\":\"Too many requests\",\"message\":\"Rate limit exceeded. Please try again later.\"}");

            // Add rate limit headers
            long remaining = rateLimitingService.getRemainingTokens(clientIp, limitType);
            response.setHeader("X-RateLimit-Remaining", String.valueOf(remaining));
            response.setHeader("Retry-After", "60");

            return;
        }

        // Add rate limit info to response headers
        long remaining = rateLimitingService.getRemainingTokens(clientIp, limitType);
        response.setHeader("X-RateLimit-Remaining", String.valueOf(remaining));

        filterChain.doFilter(request, response);
    }

    // Determine rate limit type based on request path
    // /
    private RateLimitType determineRateLimitType(String path) {
        if (path.startsWith("/api/auth/login") ||
                path.startsWith("/api/auth/register") ||
                path.startsWith("/api/auth/google")) {
            return RateLimitType.AUTH;
        }

        if (path.contains("/upload") ||
                path.contains("/files") ||
                path.startsWith("/api/storage")) {
            return RateLimitType.UPLOAD;
        }

        return RateLimitType.API;
    }

    // Extract client IP from request
    // Handles reverse proxy scenarios with X-Forwarded-For header
    // /
    private String extractClientIp(HttpServletRequest request) {
        // Check for proxy headers first
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            // X-Forwarded-For can contain multiple IPs, take the first one
            return xForwardedFor.split(",")[0].trim();
        }

        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }

        return request.getRemoteAddr();
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // If rate limiting is disabled (e.g. in tests), skip entirely
        if (!enabled) {
            return true;
        }

        String path = request.getRequestURI();

        // Skip rate limiting for health checks and static resources
        return path.startsWith("/actuator/health") ||
                path.startsWith("/swagger") ||
                path.startsWith("/v3/api-docs") ||
                path.equals("/error");
    }
}
