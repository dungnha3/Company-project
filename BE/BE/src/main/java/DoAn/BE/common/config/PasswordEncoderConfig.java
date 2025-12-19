package DoAn.BE.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

// Cấu hình password encoder sử dụng BCrypt
@Configuration
public class PasswordEncoderConfig {

    @Value("${security.password.strength:10}") // Default strength = 10
    private int bcryptStrength;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(bcryptStrength); // BCrypt với strength có thể config
    }
}
