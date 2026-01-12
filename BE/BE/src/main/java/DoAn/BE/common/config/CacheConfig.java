package DoAn.BE.common.config;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Cache Configuration
 * 
 * Simple in-memory cache for performance optimization.
 * Does not require Redis or external dependencies.
 * 
 * For production with Redis:
 * 1. Add spring-boot-starter-data-redis dependency
 * 2. Configure redis host/port in application.properties
 * 3. Create separate RedisCacheConfig class
 */
@Configuration
@EnableCaching
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

    /**
     * Simple in-memory CacheManager
     * No external dependencies required
     */
    @Bean
    public CacheManager cacheManager() {
        return new ConcurrentMapCacheManager(
                CACHE_USERS,
                CACHE_COMPANIES,
                CACHE_COMPANY_SETTINGS,
                CACHE_EMPLOYEES,
                CACHE_DEPARTMENTS,
                CACHE_DEPARTMENT,
                CACHE_POSITIONS,
                CACHE_PROJECTS);
    }
}
