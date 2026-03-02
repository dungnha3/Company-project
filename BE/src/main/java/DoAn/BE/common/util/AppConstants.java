package DoAn.BE.common.util;

public class AppConstants {
    public static final String HEADER_COMPANY_ID = "X-Company-Id";

    public static final String[] PUBLIC_ENDPOINTS = {
            "/api/auth/**",
            "/api/public/**",
            "/api/app/**",
            "/ws/**",
            // Swagger/OpenAPI documentation
            "/swagger-ui/**",
            "/swagger-ui.html",
            "/v3/api-docs/**",
            "/v3/api-docs.yaml"
    };

    private AppConstants() {
        // Private constructor to prevent instantiation
    }
}
