package DoAn.BE.common.config;

import java.util.concurrent.Executor;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

// [Configuration for async processing]
// Handles non-blocking operations like push notifications, emails, audit logs
@Configuration
@EnableAsync
public class AsyncConfig {

    // [Main async executor for background tasks]
    @Bean(name = "taskExecutor")
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        // Core pool size - number of threads to keep in the pool
        executor.setCorePoolSize(5);
        // Max pool size - maximum threads when queue is full
        executor.setMaxPoolSize(15);
        // Queue capacity - tasks waiting when all threads are busy
        executor.setQueueCapacity(200);
        // Thread name prefix for easy debugging
        executor.setThreadNamePrefix("Async-");
        // Wait for tasks to complete on shutdown
        executor.setWaitForTasksToCompleteOnShutdown(true);
        // Wait timeout on shutdown (seconds)
        executor.setAwaitTerminationSeconds(30);
        executor.setTaskDecorator(new ContextAwareTaskDecorator());
        executor.initialize();
        return executor;
    }

    // [Separate executor for notifications - higher priority]
    @Bean(name = "notificationExecutor")
    public Executor notificationExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(3);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(500);
        executor.setThreadNamePrefix("Notification-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);
        executor.setTaskDecorator(new ContextAwareTaskDecorator());
        executor.initialize();
        return executor;
    }

    // [Separate executor for Firebase sync - lower priority]
    @Bean(name = "syncExecutor")
    public Executor syncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(5);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("Sync-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.setTaskDecorator(new ContextAwareTaskDecorator());
        executor.initialize();
        return executor;
    }
    // threads
    public static class ContextAwareTaskDecorator implements org.springframework.core.task.TaskDecorator {
        @Override
        public Runnable decorate(Runnable runnable) {
            // Capture context from calling thread
            Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();
            boolean personalMode = DoAn.BE.common.context.TenantContext.isPersonalMode();
            Long userId = DoAn.BE.common.context.TenantContext.getCurrentUserId();
            org.springframework.security.core.context.SecurityContext securityContext = org.springframework.security.core.context.SecurityContextHolder
                    .getContext();

            return () -> {
                try {
                    // Apply TenantContext to async thread
                    if (companyId != null) {
                        DoAn.BE.common.context.TenantContext.setCompanyId(companyId);
                    }
                    if (personalMode) {
                        DoAn.BE.common.context.TenantContext.setPersonalMode(true);
                    }
                    if (userId != null) {
                        DoAn.BE.common.context.TenantContext.setCurrentUserId(userId);
                    }
                    // Apply SecurityContext to async thread
                    org.springframework.security.core.context.SecurityContextHolder.setContext(securityContext);

                    runnable.run();
                } finally {
                    DoAn.BE.common.context.TenantContext.clear();
                    org.springframework.security.core.context.SecurityContextHolder.clearContext();
                }
            };
        }
    }
}
