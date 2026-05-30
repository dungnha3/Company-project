package DoAn.BE.common.config;

// Cache Configuration Constants
//
// Cache name constants for use across the application.
// CacheManager is defined in RedisConfig using ConcurrentMapCacheManager (in-memory).
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

    private CacheConfig() {
        // Utility class - prevent instantiation
    }
}
