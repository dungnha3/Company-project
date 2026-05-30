package DoAn.BE.common.config;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import lombok.extern.slf4j.Slf4j;

@Configuration
@EnableCaching
@Slf4j
public class LocalCacheConfig {

    @Bean
    public CacheManager cacheManager() {
        log.info("📦 Cấu hình IN-MEMORY cache thành công (Không phụ thuộc vào Redis)");
        return new ConcurrentMapCacheManager(
                "users", "userProfiles",
                "companies", "companySettings",
                "departments", "positions",
                "employees", "projects",
                "department", "position");
    }
}
