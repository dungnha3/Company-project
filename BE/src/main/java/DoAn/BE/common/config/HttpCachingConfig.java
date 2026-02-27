package DoAn.BE.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.lang.NonNull;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.concurrent.TimeUnit;

// HTTP Caching Configuration
//
// Adds proper HTTP cache headers for:
// - Static resources: long cache (1 year)
// - API responses: short cache for read-only endpoints
//
// Benefits:
// - Reduces server load
// - Faster page loads for users
// - Lower bandwidth usage
// /
@Configuration
public class HttpCachingConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(@NonNull ResourceHandlerRegistry registry) {
        // Static resources: Cache for 1 year
        registry.addResourceHandler("/static/**")
                .addResourceLocations("classpath:/static/")
                .setCacheControl(CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic());
    }

    @Override
    public void addInterceptors(@NonNull InterceptorRegistry registry) {
        // Add cache headers for specific API endpoints
        registry.addInterceptor(new ApiCacheInterceptor())
                .addPathPatterns("/api/**");
    }

    // Interceptor to add cache headers based on request type
    // /
    static class ApiCacheInterceptor implements HandlerInterceptor {

        @Override
        public void afterCompletion(@NonNull HttpServletRequest request,
                @NonNull HttpServletResponse response,
                @NonNull Object handler,
                Exception ex) {
            // Skip if already has cache headers or if error
            if (response.containsHeader("Cache-Control") || response.getStatus() >= 400) {
                return;
            }

            String method = request.getMethod();
            String path = request.getRequestURI();

            // Read-only GET requests for static-ish data
            if ("GET".equals(method)) {
                if (isShortCacheable(path)) {
                    // Cache for 5 minutes - for semi-static data
                    response.setHeader("Cache-Control", "private, max-age=300");
                } else if (isMicroCacheable(path)) {
                    // Cache for 30 seconds - for frequently changing data
                    response.setHeader("Cache-Control", "private, max-age=30");
                } else {
                    // No cache for sensitive data
                    response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
                }
            } else {
                // POST/PUT/DELETE - no cache
                response.setHeader("Cache-Control", "no-store");
            }
        }

        private boolean isShortCacheable(String path) {
            // Data that rarely changes - 5 min cache
            return path.contains("/departments") ||
                    path.contains("/positions") ||
                    path.contains("/issue-statuses") ||
                    path.contains("/company/settings");
        }

        private boolean isMicroCacheable(String path) {
            // Data that changes but not instantly - 30 sec cache
            return path.contains("/projects") ||
                    path.contains("/employees") ||
                    path.contains("/statistics");
        }
    }
}
