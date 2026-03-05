package DoAn.BE.common.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
@Slf4j
public class PerformanceMonitorFilter extends OncePerRequestFilter {

    // Threshold in milliseconds - only log requests slower than this
    private static final long SLOW_REQUEST_THRESHOLD_MS = 500;

    // Threshold for warning level
    private static final long VERY_SLOW_REQUEST_THRESHOLD_MS = 2000;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        // Skip static resources and health checks
        String path = request.getRequestURI();
        if (shouldSkip(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        long startTime = System.currentTimeMillis();

        try {
            filterChain.doFilter(request, response);
        } finally {
            long duration = System.currentTimeMillis() - startTime;

            if (duration >= VERY_SLOW_REQUEST_THRESHOLD_MS) {
                log.warn("VERY SLOW REQUEST: {} {} took {}ms (status: {})",
                        request.getMethod(), path, duration, response.getStatus());
            } else if (duration >= SLOW_REQUEST_THRESHOLD_MS) {
                log.info("Slow request: {} {} took {}ms",
                        request.getMethod(), path, duration);
            }
            // Fast requests are not logged to reduce noise
        }
    }

    private boolean shouldSkip(String path) {
        return path.startsWith("/actuator") ||
                path.startsWith("/favicon") ||
                path.endsWith(".js") ||
                path.endsWith(".css") ||
                path.endsWith(".png") ||
                path.endsWith(".jpg") ||
                path.endsWith(".ico");
    }
}
