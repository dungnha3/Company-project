package DoAn.BE.common.config;

import java.time.Duration;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import lombok.extern.slf4j.Slf4j;

// [Flexible caching configuration]
// - Dùng Redis nếu spring.cache.type=redis VÀ Redis đang chạy
// - Dùng In-Memory cache nếu spring.cache.type=simple
@Configuration
@EnableCaching
@Slf4j
public class RedisConfig {

        // ==================== IN-MEMORY CACHE (Mặc định, không cần Redis)
        // ====================

        @Bean
        @Primary
        @ConditionalOnProperty(name = "spring.cache.type", havingValue = "simple", matchIfMissing = true)
        public CacheManager simpleCacheManager() {
                log.info("📦 Sử dụng IN-MEMORY cache (không cần Redis)");
                return new ConcurrentMapCacheManager(
                                "users", "userProfiles",
                                "companies", "companySettings",
                                "departments", "positions",
                                "employees", "projects",
                                "department", "position");
        }

        @Bean
        @ConditionalOnProperty(name = "spring.cache.type", havingValue = "redis")
        public RedisCacheConfiguration cacheConfiguration() {
                return RedisCacheConfiguration.defaultCacheConfig()
                                .entryTtl(Duration.ofMinutes(10))
                                .disableCachingNullValues()
                                .serializeKeysWith(RedisSerializationContext.SerializationPair
                                                .fromSerializer(new StringRedisSerializer()))
                                .serializeValuesWith(RedisSerializationContext.SerializationPair
                                                .fromSerializer(new GenericJackson2JsonRedisSerializer()));
        }

        @Bean
        @ConditionalOnProperty(name = "spring.cache.type", havingValue = "redis")
        public CacheManager redisCacheManager(RedisConnectionFactory connectionFactory) {
                log.info("🚀 Sử dụng REDIS cache (Docker container)");

                RedisCacheConfiguration shortLived = RedisCacheConfiguration.defaultCacheConfig()
                                .entryTtl(Duration.ofMinutes(5))
                                .disableCachingNullValues()
                                .serializeValuesWith(RedisSerializationContext.SerializationPair
                                                .fromSerializer(new GenericJackson2JsonRedisSerializer()));

                RedisCacheConfiguration mediumLived = RedisCacheConfiguration.defaultCacheConfig()
                                .entryTtl(Duration.ofMinutes(30))
                                .disableCachingNullValues()
                                .serializeValuesWith(RedisSerializationContext.SerializationPair
                                                .fromSerializer(new GenericJackson2JsonRedisSerializer()));

                RedisCacheConfiguration longLived = RedisCacheConfiguration.defaultCacheConfig()
                                .entryTtl(Duration.ofHours(1))
                                .disableCachingNullValues()
                                .serializeValuesWith(RedisSerializationContext.SerializationPair
                                                .fromSerializer(new GenericJackson2JsonRedisSerializer()));

                return RedisCacheManager.builder(connectionFactory)
                                .cacheDefaults(cacheConfiguration())
                                .withCacheConfiguration("users", shortLived)
                                .withCacheConfiguration("userProfiles", shortLived)
                                .withCacheConfiguration("companies", mediumLived)
                                .withCacheConfiguration("companySettings", mediumLived)
                                .withCacheConfiguration("departments", longLived)
                                .withCacheConfiguration("positions", longLived)
                                .withCacheConfiguration("employees", mediumLived)
                                .withCacheConfiguration("projects", mediumLived)
                                .build();
        }

        @Bean
        @ConditionalOnProperty(name = "spring.cache.type", havingValue = "redis")
        public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
                RedisTemplate<String, Object> template = new RedisTemplate<>();
                template.setConnectionFactory(connectionFactory);
                template.setKeySerializer(new StringRedisSerializer());
                template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
                template.setHashKeySerializer(new StringRedisSerializer());
                template.setHashValueSerializer(new GenericJackson2JsonRedisSerializer());
                template.afterPropertiesSet();
                return template;
        }
}
