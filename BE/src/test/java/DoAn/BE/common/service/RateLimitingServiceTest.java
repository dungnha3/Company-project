package DoAn.BE.common.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

// Unit tests for RateLimitingService
// /
class RateLimitingServiceTest {

    private RateLimitingService rateLimitingService;

    @BeforeEach
    void setUp() {
        rateLimitingService = new RateLimitingService();
    }

    @Test
    @DisplayName("Should allow requests within rate limit")
    void shouldAllowRequestsWithinLimit() {
        String testIp = "192.168.1.1";

        // AUTH limit is 10 per minute
        for (int i = 0; i < 10; i++) {
            assertTrue(rateLimitingService.tryConsume(testIp, RateLimitingService.RateLimitType.AUTH),
                    "Request " + (i + 1) + " should be allowed");
        }
    }

    @Test
    @DisplayName("Should block requests exceeding AUTH rate limit")
    void shouldBlockExceedingAuthLimit() {
        String testIp = "192.168.1.2";

        // Consume all 10 AUTH tokens
        for (int i = 0; i < 10; i++) {
            rateLimitingService.tryConsume(testIp, RateLimitingService.RateLimitType.AUTH);
        }

        // 11th request should be blocked
        assertFalse(rateLimitingService.tryConsume(testIp, RateLimitingService.RateLimitType.AUTH),
                "11th request should be blocked");
    }

    @Test
    @DisplayName("Should have separate buckets for different IPs")
    void shouldHaveSeparateBucketsPerIp() {
        String ip1 = "10.0.0.1";
        String ip2 = "10.0.0.2";

        // Exhaust limit for ip1
        for (int i = 0; i < 10; i++) {
            rateLimitingService.tryConsume(ip1, RateLimitingService.RateLimitType.AUTH);
        }

        // ip2 should still have quota
        assertTrue(rateLimitingService.tryConsume(ip2, RateLimitingService.RateLimitType.AUTH),
                "Different IP should have its own quota");
    }

    @Test
    @DisplayName("Should have higher limit for API than AUTH")
    void shouldHaveHigherApiLimit() {
        String testIp = "172.16.0.1";

        // API limit is 100, AUTH is 10
        long apiRemaining = rateLimitingService.getRemainingTokens(testIp, RateLimitingService.RateLimitType.API);
        long authRemaining = rateLimitingService.getRemainingTokens(testIp, RateLimitingService.RateLimitType.AUTH);

        assertTrue(apiRemaining > authRemaining,
                "API should have higher limit than AUTH");
    }

    @Test
    @DisplayName("Should clear buckets for IP")
    void shouldClearBucketsForIp() {
        String testIp = "192.168.100.1";

        // Consume some tokens
        rateLimitingService.tryConsume(testIp, RateLimitingService.RateLimitType.AUTH);
        rateLimitingService.tryConsume(testIp, RateLimitingService.RateLimitType.API);

        // Clear buckets
        rateLimitingService.clearBuckets(testIp);

        // New bucket should have full quota
        assertEquals(10, rateLimitingService.getRemainingTokens(testIp, RateLimitingService.RateLimitType.AUTH),
                "After clear, AUTH bucket should be full");
        assertEquals(100, rateLimitingService.getRemainingTokens(testIp, RateLimitingService.RateLimitType.API),
                "After clear, API bucket should be full");
    }

    @Test
    @DisplayName("Default resolveBucket should use API type")
    void defaultResolveBucketShouldUseApiType() {
        String testIp = "192.168.50.1";

        var bucket1 = rateLimitingService.resolveBucket(testIp);
        var bucket2 = rateLimitingService.resolveBucket(testIp, RateLimitingService.RateLimitType.API);

        assertEquals(bucket1.getAvailableTokens(), bucket2.getAvailableTokens(),
                "Default bucket should be API bucket");
    }
}
