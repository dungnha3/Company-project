package DoAn.BE.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.annotation.EnableTransactionManagement;

/**
 * JPA Performance Optimization Configuration
 * 
 * Most optimizations are in application.properties:
 * - hibernate.jdbc.batch_size
 * - hibernate.order_inserts/order_updates
 * - hikari connection pool settings
 * 
 * This config just enables transaction management.
 * The default Spring Boot TransactionManager is used (no custom bean needed).
 */
@Configuration
@EnableTransactionManagement
public class JpaPerformanceConfig {
    // Using default Spring Boot auto-configured TransactionManager
    // No custom bean to avoid conflicts
}
