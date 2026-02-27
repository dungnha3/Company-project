package DoAn.BE.common.config;

// Cache Configuration Constants
//
// Cache names constants for use across the application.
// CacheManager beans are defined in RedisConfig with proper conditional logic:
// - SimpleCacheManager for local development (spring.cache.type=simple)
// - RedisCacheManager for production (spring.cache.type=redis)
// /
public class CacheConfig {

    // Cache name constants
    public static final String CACHE_USERS = "users";
    public static final String CACHE_COMPANIES = "companies";
    public static final String CACHE_COMPANY_SETTINGS = "companySettings";
    public static final String CACHE_EMPLOYEES = "employees";
    public static final String CACHE_DEPARTMENTS = "departments";
    public static final String CACHE_DEPARTMENT = "department";
    public static final String CACHE_POSITIONS = "positions";
    public static final String CACHE_PROJECTS = "projects";
    public static final String CACHE_INTEGRATIONS = "integrations";

    private CacheConfig() {
        // Utility class - prevent instantiation
    }
}
