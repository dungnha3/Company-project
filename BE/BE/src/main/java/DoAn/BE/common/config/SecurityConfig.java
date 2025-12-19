package DoAn.BE.common.config;

import DoAn.BE.auth.filter.JwtAuthenticationFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    @Autowired
    @Lazy
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(authz -> authz
                        // ===== PUBLIC ENDPOINTS =====
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/api/public/**").permitAll()
                        .requestMatchers("/actuator/**").permitAll()

                        // ===== WEBSOCKET ENDPOINTS =====
                        .requestMatchers("/ws/**").permitAll()

                        // ===== ADMIN ENDPOINTS =====
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        // Allow Admin and HR Manager to view users list (for notification recipient
                        // selection)
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/users")
                        .hasAnyRole("ADMIN", "MANAGER_HR")
                        // Allow all authenticated users to get active users (for adding project
                        // members)
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/users/active")
                        .hasAnyRole("ADMIN", "MANAGER_HR", "MANAGER_PROJECT", "MANAGER_ACCOUNTING", "EMPLOYEE")
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/users/search")
                        .authenticated()
                        // All other user operations are ADMIN only
                        .requestMatchers("/api/users/**").hasRole("ADMIN")
                        // HR Manager can create accounts with employees
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/accounts/with-employee")
                        .hasAnyRole("ADMIN", "MANAGER_HR")
                        // Other account operations are ADMIN only
                        .requestMatchers("/api/accounts/**").hasRole("ADMIN")
                        .requestMatchers("/api/audit-logs/**").hasRole("ADMIN")

                        // ===== HR MANAGER ENDPOINTS =====
                        .requestMatchers("/api/nhan-vien/user/**")
                        .hasAnyRole("ADMIN", "EMPLOYEE", "MANAGER_HR", "MANAGER_ACCOUNTING", "MANAGER_PROJECT")
                        .requestMatchers("/api/nhan-vien/**").hasAnyRole("ADMIN", "MANAGER_HR", "MANAGER_ACCOUNTING")
                        .requestMatchers("/api/phong-ban/**").hasRole("MANAGER_HR")
                        .requestMatchers("/api/chuc-vu/**").hasRole("MANAGER_HR")
                        // Allow employees to view their own contracts
                        .requestMatchers("/api/hop-dong/nhan-vien/**")
                        .hasAnyRole("EMPLOYEE", "MANAGER_HR", "MANAGER_ACCOUNTING", "MANAGER_PROJECT")
                        // Other contract operations are HR Manager only
                        .requestMatchers("/api/hop-dong/**").hasRole("MANAGER_HR")
                        .requestMatchers("/api/hr/role-change-request/**").hasRole("MANAGER_HR")
                        .requestMatchers("/api/danh-gia/**")
                        .hasAnyRole("MANAGER_HR", "MANAGER_PROJECT", "EMPLOYEE")

                        // ===== ACCOUNTING MANAGER ENDPOINTS =====
                        .requestMatchers("/api/bang-luong/tinh-tu-dong/**").hasRole("MANAGER_ACCOUNTING")
                        .requestMatchers("/api/bang-luong/export/**").hasRole("MANAGER_ACCOUNTING")
                        .requestMatchers("/api/bang-luong/nhan-vien/**")
                        .hasAnyRole("EMPLOYEE", "MANAGER_HR", "MANAGER_ACCOUNTING", "MANAGER_PROJECT")
                        .requestMatchers("/api/cham-cong/manage/**").hasRole("MANAGER_ACCOUNTING")
                        .requestMatchers("/api/cham-cong/nhan-vien/**")
                        .hasAnyRole("EMPLOYEE", "MANAGER_HR", "MANAGER_ACCOUNTING", "MANAGER_PROJECT")
                        .requestMatchers("/api/nghi-phep/approve/**")
                        .hasAnyRole("MANAGER_ACCOUNTING", "MANAGER_PROJECT")
                        .requestMatchers("/api/hr/salary-proposal/**")
                        .hasAnyRole("MANAGER_HR", "MANAGER_ACCOUNTING")
                        .requestMatchers("/api/export/**").hasAnyRole("MANAGER_HR", "MANAGER_ACCOUNTING")
                        .requestMatchers("/api/dashboard/**")
                        .hasAnyRole("MANAGER_HR", "MANAGER_ACCOUNTING", "MANAGER_PROJECT")

                        // ===== PROJECT ENDPOINTS =====
                        .requestMatchers("/api/projects/**").hasAnyRole("MANAGER_PROJECT", "EMPLOYEE")
                        .requestMatchers("/api/issues/**").hasAnyRole("MANAGER_PROJECT", "EMPLOYEE")
                        .requestMatchers("/api/sprints/**").hasAnyRole("MANAGER_PROJECT", "EMPLOYEE")
                        .requestMatchers("/api/comments/**").hasAnyRole("MANAGER_PROJECT", "EMPLOYEE")
                        .requestMatchers("/api/activities/**").hasAnyRole("MANAGER_PROJECT", "EMPLOYEE")
                        .requestMatchers("/api/project-dashboard/**").hasAnyRole("MANAGER_PROJECT", "EMPLOYEE")

                        // ===== EMPLOYEE ENDPOINTS =====
                        .requestMatchers("/api/profile/**").authenticated()
                        .requestMatchers("/api/cham-cong/gps")
                        .hasAnyRole("EMPLOYEE", "MANAGER_PROJECT", "MANAGER_HR", "MANAGER_ACCOUNTING")
                        .requestMatchers("/api/cham-cong/my/**").authenticated()
                        .requestMatchers("/api/bang-luong/my/**").authenticated()
                        .requestMatchers("/api/nghi-phep/my/**").authenticated()
                        .requestMatchers("/api/nghi-phep/**")
                        .hasAnyRole("EMPLOYEE", "MANAGER_HR", "MANAGER_ACCOUNTING", "MANAGER_PROJECT")

                        // ===== CHAT & MEETINGS =====
                        .requestMatchers("/api/chat/**")
                        .hasAnyRole("EMPLOYEE", "MANAGER_HR", "MANAGER_ACCOUNTING", "MANAGER_PROJECT")
                        .requestMatchers("/api/meetings/**")
                        .hasAnyRole("EMPLOYEE", "MANAGER_HR", "MANAGER_ACCOUNTING", "MANAGER_PROJECT")
                        .requestMatchers("/api/storage/**").authenticated()

                        // ===== AI CHATBOT =====
                        .requestMatchers("/api/ai/**")
                        .hasAnyRole("EMPLOYEE", "MANAGER_HR", "MANAGER_ACCOUNTING", "MANAGER_PROJECT")

                        // ===== NOTIFICATIONS =====
                        .requestMatchers("/api/notifications/**").authenticated()
                        .requestMatchers("/api/thong-bao/**").authenticated()

                        // All other requests require authentication
                        .anyRequest().authenticated())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.asList("*"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}