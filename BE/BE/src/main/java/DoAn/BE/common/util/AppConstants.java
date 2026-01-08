package DoAn.BE.common.util;

public class AppConstants {
    public static final String HEADER_COMPANY_ID = "X-Company-Id";

    public static final String[] PUBLIC_ENDPOINTS = {
            "/api/auth/**",
            "/api/public/**",
            "/api/app/**",
            "/actuator/**",
            "/ws/**"
    };

    private AppConstants() {
        // Private constructor to prevent instantiation
    }
}
