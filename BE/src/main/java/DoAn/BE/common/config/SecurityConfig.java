package DoAn.BE.common.config;

import DoAn.BE.auth.filter.JwtAuthenticationFilter;
import DoAn.BE.common.filter.RateLimitingFilter;
import DoAn.BE.common.filter.SecurityHeadersFilter;
import DoAn.BE.common.filter.TenantFilter;
import DoAn.BE.common.util.AppConstants;
import DoAn.BE.company.entity.CompanyRole;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import java.util.List;
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

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

        // Role group constants for cleaner code
        private static final String[] COMPANY_ADMINS = {
                        CompanyRole.OWNER.name(),
                        CompanyRole.COMPANY_ADMIN.name()
        };

        private static final String SYSTEM_ADMIN = "SYSTEM_ADMIN";

        @Autowired
        @Lazy
        private JwtAuthenticationFilter jwtAuthenticationFilter;

        @Autowired
        private TenantFilter tenantFilter;

        @Autowired
        private RateLimitingFilter rateLimitingFilter;

        @Autowired
        private SecurityHeadersFilter securityHeadersFilter;

        @Bean
        public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
                http
                                .csrf(csrf -> csrf.disable())
                                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                                .sessionManagement(session -> session.sessionCreationPolicy(
                                                SessionCreationPolicy.STATELESS))
                                .authorizeHttpRequests(authz -> authz
                                                // ===== PUBLIC ENDPOINTS =====
                                                .requestMatchers(AppConstants.PUBLIC_ENDPOINTS).permitAll()

                                                // ===== COMMON ENDPOINTS (Tenant Agnostic) =====
                                                .requestMatchers("/api/workspaces/**").authenticated()
                                                .requestMatchers("/api/invites/**").authenticated()

                                                // ===== SYSTEM ADMIN ENDPOINTS =====
                                                .requestMatchers("/api/companies/admin/**").hasRole(SYSTEM_ADMIN)
                                                .requestMatchers("/api/sysadmin/**").hasRole(SYSTEM_ADMIN)

                                                // ===== ADMIN ENDPOINTS =====
                                                .requestMatchers("/api/admin/**").hasAnyRole(COMPANY_ADMINS)
                                                .requestMatchers("/api/audit-logs/**").hasAnyRole(COMPANY_ADMINS)

                                                // ===== ALL OTHER API ENDPOINTS =====
                                                // Authorization is delegated to the Service/Controller layer
                                                // using AccessControlService to support granular permissions.
                                                .requestMatchers("/api/**").authenticated()
                                                .anyRequest().authenticated())
                                .formLogin(form -> form.disable())
                                .httpBasic(basic -> basic.disable())
                                .addFilterBefore(rateLimitingFilter, UsernamePasswordAuthenticationFilter.class)
                                .addFilterBefore(securityHeadersFilter, RateLimitingFilter.class)
                                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                                .addFilterAfter(tenantFilter, jwtAuthenticationFilter.getClass());

                return http.build();
        }

        // (conflicts with allowCredentials)
        @Value("${cors.allowed-origins:http://localhost:3000,http://localhost:4200,http://localhost:5173}")
        private String allowedOrigins;

        @Value("${cors.allowed-methods:GET,POST,PUT,DELETE,PATCH,OPTIONS}")
        private String allowedMethods;

        @Value("${cors.allowed-headers:*}")
        private String allowedHeaders;

        @Bean
        public CorsConfigurationSource corsConfigurationSource() {
                CorsConfiguration configuration = new CorsConfiguration();

                // Configurable CORS policies with robust manual parsing to support spaces and clear formatting
                if (allowedOrigins != null && !allowedOrigins.trim().isEmpty()) {
                        for (String origin : allowedOrigins.split(",")) {
                                configuration.addAllowedOrigin(origin.trim());
                        }
                }

                if (allowedMethods != null && !allowedMethods.trim().isEmpty()) {
                        for (String method : allowedMethods.split(",")) {
                                configuration.addAllowedMethod(method.trim());
                        }
                }

                if (allowedHeaders != null && !allowedHeaders.trim().isEmpty()) {
                        for (String header : allowedHeaders.split(",")) {
                                configuration.addAllowedHeader(header.trim());
                        }
                }

                configuration.setAllowCredentials(true);

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                source.registerCorsConfiguration("/**", configuration);
                return source;
        }
}