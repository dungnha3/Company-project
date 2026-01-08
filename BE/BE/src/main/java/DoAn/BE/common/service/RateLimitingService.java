package DoAn.BE.common.service;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

// Service quản lý Rate Limiting

// Sử dụng Bucket4j để giới hạn số lượng request từ mỗi IP
@Service
public class RateLimitingService {

    private final Map<String, Bucket> cache = new ConcurrentHashMap<>();

    // Giới hạn: 50 requests / 1 phút per IP
    public Bucket resolveBucket(String ipAddress) {
        return cache.computeIfAbsent(ipAddress, key -> newBucket());
    }

    private Bucket newBucket() {
        // Refill 50 tokens per 1 minute
        Bandwidth limit = Bandwidth.classic(50, Refill.greedy(50, Duration.ofMinutes(1)));
        return Bucket.builder()
                .addLimit(limit)
                .build();
    }
}
