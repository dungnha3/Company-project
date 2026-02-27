package DoAn.BE.common.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

// Security Headers Filter
//
// Adds security headers to all HTTP responses to protect against:
// - Clickjacking (X-Frame-Options)
// - MIME type sniffing (X-Content-Type-Options)
// - XSS attacks (Content-Security-Policy)
// - Information leakage (X-Powered-By removal, Referrer-Policy)
// - HTTPS enforcement (Strict-Transport-Security)
// /
@Component
public class SecurityHeadersFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        // Prevent Clickjacking - deny all framing
        response.setHeader("X-Frame-Options", "DENY");

        // Prevent MIME type sniffing
        response.setHeader("X-Content-Type-Options", "nosniff");

        // Enable XSS filter in browsers
        response.setHeader("X-XSS-Protection", "1; mode=block");

        // Content Security Policy - restrictive but allows API operation
        // For SPA frontend, this mainly applies to any HTML responses
        response.setHeader("Content-Security-Policy",
                "default-src 'self'; " +
                        "script-src 'self'; " +
                        "style-src 'self' 'unsafe-inline'; " +
                        "img-src 'self' data: https:; " +
                        "font-src 'self' https://fonts.gstatic.com; " +
                        "connect-src 'self'; " +
                        "frame-ancestors 'none'; " +
                        "base-uri 'self'; " +
                        "form-action 'self'");

        // Referrer Policy - don't leak URLs
        response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

        // Permissions Policy - disable unused browser features
        response.setHeader("Permissions-Policy",
                "geolocation=(), " +
                        "microphone=(), " +
                        "camera=(), " +
                        "payment=(), " +
                        "usb=()");

        // HSTS - Force HTTPS (only in production)
        // Set max-age to 1 year (31536000 seconds)
        if (request.isSecure()) {
            response.setHeader("Strict-Transport-Security",
                    "max-age=31536000; includeSubDomains; preload");
        }

        // Hide server technology
        response.setHeader("X-Powered-By", "");

        // Cache control for sensitive endpoints
        String path = request.getRequestURI();
        if (path.startsWith("/api/auth") || path.contains("/salary") || path.contains("/employee")) {
            response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
            response.setHeader("Pragma", "no-cache");
            response.setHeader("Expires", "0");
        }

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // Apply headers to all requests
        String path = request.getRequestURI();
        // Skip for static resources if any
        return path.startsWith("/static/") || path.endsWith(".ico");
    }
}
