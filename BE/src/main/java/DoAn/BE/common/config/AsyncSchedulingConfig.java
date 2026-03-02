package DoAn.BE.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;


// This config only enables @Scheduled methods
@Configuration
@EnableScheduling
public class AsyncSchedulingConfig {
}
