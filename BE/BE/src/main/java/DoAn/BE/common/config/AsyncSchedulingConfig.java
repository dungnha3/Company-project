package DoAn.BE.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

// Cấu hình async processing và scheduled tasks cho toàn hệ thống
@Configuration
@EnableAsync // Cho phép @Async methods
@EnableScheduling // Cho phép @Scheduled methods
public class AsyncSchedulingConfig {
}
