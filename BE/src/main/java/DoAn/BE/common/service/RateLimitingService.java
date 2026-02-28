package DoAn.BE.common.service;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

// Service quản lý Rate Limiting
// Sử dụng Bucket4j để giới hạn số lượng request từ mỗi IP
//
// Different limits for different endpoint types:
// - AUTH: 10 requests/minute (login, register)
// - API: 100 requests/minute (general API)
// - UPLOAD: 20 requests/minute (file uploads)
// /
@Service
@Slf4j
public class RateLimitingService {

    private static final int MAX_CACHE_SIZE = 10_000;

    private final Map<String, Bucket> authCache = new ConcurrentHashMap<>();
    private final Map<String, Bucket> apiCache = new ConcurrentHashMap<>();
    private final Map<String, Bucket> uploadCache = new ConcurrentHashMap<>();
    // Buckets auto-refill on next access, so clearing is safe
    @Scheduled(fixedRate = 300_000) // 5 minutes
    public void evictStaleBuckets() {
        int totalBefore = authCache.size() + apiCache.size() + uploadCache.size();
        if (totalBefore > MAX_CACHE_SIZE) {
            authCache.clear();
            apiCache.clear();
            uploadCache.clear();
            log.info("Evicted {} rate limit buckets (exceeded max {})", totalBefore, MAX_CACHE_SIZE);
        }
    }

    // Rate limit types
    public enum RateLimitType {
        AUTH, // Strict limit for auth endpoints
        API, // Standard limit for API
        UPLOAD // Limit for file uploads
    }

    // Get bucket for IP based on endpoint type
    // /
    public Bucket resolveBucket(String ipAddress, RateLimitType type) {
        return switch (type) {
            case AUTH -> authCache.computeIfAbsent(ipAddress, key -> createAuthBucket());
            case UPLOAD -> uploadCache.computeIfAbsent(ipAddress, key -> createUploadBucket());
            default -> apiCache.computeIfAbsent(ipAddress, key -> createApiBucket());
        };
    }

    // Default API bucket resolution (backward compatible)
    // /
    public Bucket resolveBucket(String ipAddress) {
        return resolveBucket(ipAddress, RateLimitType.API);
    }

    // Try to consume a token, returns true if allowed
    // /
    public boolean tryConsume(String ipAddress, RateLimitType type) {
        Bucket bucket = resolveBucket(ipAddress, type);
        boolean consumed = bucket.tryConsume(1);
        if (!consumed) {
            log.warn("Rate limit exceeded for IP: {} on type: {}", ipAddress, type);
        }
        return consumed;
    }

    // Get remaining tokens for an IP
    // /
    public long getRemainingTokens(String ipAddress, RateLimitType type) {
        return resolveBucket(ipAddress, type).getAvailableTokens();
    }

    // Auth endpoints: 10 requests per minute (strict for brute force protection)
    private Bucket createAuthBucket() {
        Bandwidth limit = Bandwidth.classic(10, Refill.greedy(10, Duration.ofMinutes(1)));
        return Bucket.builder().addLimit(limit).build();
    }

    // API endpoints: 100 requests per minute
    private Bucket createApiBucket() {
        Bandwidth limit = Bandwidth.classic(100, Refill.greedy(100, Duration.ofMinutes(1)));
        return Bucket.builder().addLimit(limit).build();
    }

    // Upload endpoints: 20 requests per minute
    private Bucket createUploadBucket() {
        Bandwidth limit = Bandwidth.classic(20, Refill.greedy(20, Duration.ofMinutes(1)));
        return Bucket.builder().addLimit(limit).build();
    }

    // Clear buckets for an IP (useful for admin override or testing)
    // /
    public void clearBuckets(String ipAddress) {
        authCache.remove(ipAddress);
        apiCache.remove(ipAddress);
        uploadCache.remove(ipAddress);
    }
}
