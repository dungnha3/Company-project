package DoAn.BE.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

// Cấu hình async processing và scheduled tasks cho toàn hệ thống
@Configuration
@EnableAsync // Cho phép @Async methods
@EnableScheduling // Cho phép @Scheduled methods
public class AsyncSchedulingConfig implements AsyncConfigurer {

    @Override
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(25);
        executor.setTaskDecorator(new TenantAwareTaskDecorator());
        executor.setThreadNamePrefix("Async-");
        executor.initialize();
        return executor;
    }
}
