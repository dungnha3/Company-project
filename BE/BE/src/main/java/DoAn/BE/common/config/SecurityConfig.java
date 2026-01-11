package DoAn.BE.common.config;

import DoAn.BE.auth.filter.JwtAuthenticationFilter;
import DoAn.BE.common.filter.RateLimitFilter;
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
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

// [Configuration bảo mật ứng dụng - JWT, CORS, Authorize Requests] (Role: System)
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

        // Role group constants for cleaner code
        private static final String[] COMPANY_ADMINS = {
                        CompanyRole.OWNER.name(),
                        CompanyRole.ADMIN.name()
        };

        private static final String[] ALL_MANAGERS = {
                        CompanyRole.OWNER.name(),
                        CompanyRole.ADMIN.name(),
                        CompanyRole.MANAGER_HR.name(),
                        CompanyRole.MANAGER_ACCOUNTING.name(),
                        CompanyRole.MANAGER_PROJECT.name()
        };

        private static final String[] ALL_EMPLOYEES = {
                        CompanyRole.OWNER.name(),
                        CompanyRole.ADMIN.name(),
                        CompanyRole.MANAGER_HR.name(),
                        CompanyRole.MANAGER_ACCOUNTING.name(),
                        CompanyRole.MANAGER_PROJECT.name(),
                        CompanyRole.EMPLOYEE.name()
        };

        private static final String SYSTEM_ADMIN = "SYSTEM_ADMIN";

        @Autowired
        @Lazy
        private JwtAuthenticationFilter jwtAuthenticationFilter;

        @Autowired
        private TenantFilter tenantFilter;

        @Autowired
        private RateLimitFilter rateLimitFilter;

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
                                                .requestMatchers("/api/debug/**").hasRole(SYSTEM_ADMIN) // DEBUG -
                                                                                                        // Secured

                                                // ===== SYSTEM ADMIN ENDPOINTS =====
                                                .requestMatchers("/api/companies/admin/**").hasRole(SYSTEM_ADMIN)

                                                // ===== ADMIN ENDPOINTS =====
                                                .requestMatchers("/api/admin/**").hasAnyRole(COMPANY_ADMINS)
                                                .requestMatchers(HttpMethod.GET, "/api/users")
                                                .hasAnyRole(CompanyRole.OWNER.name(), CompanyRole.ADMIN.name(),
                                                                CompanyRole.MANAGER_HR.name())
                                                .requestMatchers(HttpMethod.GET, "/api/users/active")
                                                .hasAnyRole(ALL_EMPLOYEES)
                                                .requestMatchers(HttpMethod.GET, "/api/users/search").authenticated()
                                                .requestMatchers("/api/users/**").hasAnyRole(COMPANY_ADMINS)
                                                .requestMatchers(HttpMethod.POST, "/api/accounts/with-employee")
                                                .hasAnyRole(CompanyRole.OWNER.name(), CompanyRole.ADMIN.name(),
                                                                CompanyRole.MANAGER_HR.name())
                                                .requestMatchers("/api/accounts/**")
                                                .hasAnyRole(CompanyRole.OWNER.name(), CompanyRole.ADMIN.name(),
                                                                SYSTEM_ADMIN)
                                                .requestMatchers("/api/audit-logs/**").hasAnyRole(COMPANY_ADMINS)

                                                // ===== HR MANAGER ENDPOINTS =====
                                                .requestMatchers("/api/employees/user/**").hasAnyRole(ALL_EMPLOYEES)
                                                .requestMatchers("/api/employees/**")
                                                .hasAnyRole(CompanyRole.OWNER.name(), CompanyRole.ADMIN.name(),
                                                                CompanyRole.MANAGER_HR.name(),
                                                                CompanyRole.MANAGER_ACCOUNTING.name())
                                                .requestMatchers("/api/departments/**")
                                                .hasAnyRole(CompanyRole.OWNER.name(), CompanyRole.ADMIN.name(),
                                                                CompanyRole.MANAGER_HR.name())
                                                .requestMatchers("/api/positions/**")
                                                .hasAnyRole(CompanyRole.OWNER.name(), CompanyRole.ADMIN.name(),
                                                                CompanyRole.MANAGER_HR.name())
                                                .requestMatchers("/api/contracts/employee/**")
                                                .hasAnyRole(CompanyRole.EMPLOYEE.name(), CompanyRole.MANAGER_HR.name(),
                                                                CompanyRole.MANAGER_ACCOUNTING.name(),
                                                                CompanyRole.MANAGER_PROJECT.name())
                                                .requestMatchers("/api/contracts/**")
                                                .hasAnyRole(CompanyRole.OWNER.name(), CompanyRole.MANAGER_HR.name())
                                                .requestMatchers("/api/hr/role-change-request/**")
                                                .hasAnyRole(CompanyRole.OWNER.name(), CompanyRole.MANAGER_HR.name())
                                                .requestMatchers("/api/reviews/**")
                                                .hasAnyRole(CompanyRole.MANAGER_HR.name(),
                                                                CompanyRole.MANAGER_PROJECT.name(),
                                                                CompanyRole.EMPLOYEE.name())

                                                // ===== ACCOUNTING MANAGER ENDPOINTS =====
                                                .requestMatchers("/api/salaries/generate/**")
                                                .hasAnyRole(CompanyRole.OWNER.name(),
                                                                CompanyRole.MANAGER_ACCOUNTING.name())
                                                .requestMatchers("/api/salaries/export/**")
                                                .hasAnyRole(CompanyRole.OWNER.name(),
                                                                CompanyRole.MANAGER_ACCOUNTING.name())
                                                .requestMatchers("/api/salaries/employee/**")
                                                .hasAnyRole(ALL_EMPLOYEES)
                                                .requestMatchers("/api/attendance/manage/**")
                                                .hasAnyRole(CompanyRole.OWNER.name(),
                                                                CompanyRole.MANAGER_ACCOUNTING.name())
                                                .requestMatchers("/api/attendance/employee/**")
                                                .hasAnyRole(CompanyRole.EMPLOYEE.name(), CompanyRole.MANAGER_HR.name(),
                                                                CompanyRole.MANAGER_ACCOUNTING.name(),
                                                                CompanyRole.MANAGER_PROJECT.name())
                                                .requestMatchers("/api/leave-requests/approve/**")
                                                .hasAnyRole(CompanyRole.MANAGER_ACCOUNTING.name(),
                                                                CompanyRole.MANAGER_PROJECT.name())
                                                .requestMatchers("/api/hr/salary-proposal/**")
                                                .hasAnyRole(CompanyRole.MANAGER_HR.name(),
                                                                CompanyRole.MANAGER_ACCOUNTING.name())
                                                .requestMatchers("/api/export/**")
                                                .hasAnyRole(CompanyRole.MANAGER_HR.name(),
                                                                CompanyRole.MANAGER_ACCOUNTING.name())
                                                .requestMatchers("/api/dashboard/**").hasAnyRole(ALL_MANAGERS)

                                                // ===== PROJECT ENDPOINTS =====
                                                .requestMatchers("/api/projects/**")
                                                .hasAnyRole(CompanyRole.OWNER.name(),
                                                                CompanyRole.MANAGER_PROJECT.name(),
                                                                CompanyRole.EMPLOYEE.name())
                                                .requestMatchers("/api/issues/**")
                                                .hasAnyRole(CompanyRole.OWNER.name(),
                                                                CompanyRole.MANAGER_PROJECT.name(),
                                                                CompanyRole.EMPLOYEE.name())
                                                .requestMatchers("/api/sprints/**")
                                                .hasAnyRole(CompanyRole.OWNER.name(),
                                                                CompanyRole.MANAGER_PROJECT.name(),
                                                                CompanyRole.EMPLOYEE.name())
                                                .requestMatchers("/api/comments/**")
                                                .hasAnyRole(CompanyRole.OWNER.name(),
                                                                CompanyRole.MANAGER_PROJECT.name(),
                                                                CompanyRole.EMPLOYEE.name())
                                                .requestMatchers("/api/activities/**")
                                                .hasAnyRole(CompanyRole.OWNER.name(),
                                                                CompanyRole.MANAGER_PROJECT.name(),
                                                                CompanyRole.EMPLOYEE.name())
                                                .requestMatchers("/api/project-dashboard/**")
                                                .hasAnyRole(CompanyRole.OWNER.name(),
                                                                CompanyRole.MANAGER_PROJECT.name(),
                                                                CompanyRole.EMPLOYEE.name())

                                                // ===== TIME TRACKING =====
                                                .requestMatchers("/api/timelogs/**")
                                                .hasAnyRole(CompanyRole.OWNER.name(),
                                                                CompanyRole.MANAGER_PROJECT.name(),
                                                                CompanyRole.EMPLOYEE.name())

                                                // ===== ANALYTICS =====
                                                .requestMatchers("/api/analytics/**")
                                                .hasAnyRole(CompanyRole.OWNER.name(),
                                                                CompanyRole.MANAGER_PROJECT.name(),
                                                                CompanyRole.EMPLOYEE.name())

                                                // ===== AUTOMATIONS =====
                                                .requestMatchers("/api/automations/**")
                                                .hasAnyRole(CompanyRole.OWNER.name(),
                                                                CompanyRole.MANAGER_PROJECT.name())

                                                // ===== EMPLOYEE ENDPOINTS =====
                                                .requestMatchers("/api/profile/**").authenticated()
                                                .requestMatchers("/api/attendance/gps")
                                                .hasAnyRole(CompanyRole.EMPLOYEE.name(),
                                                                CompanyRole.MANAGER_PROJECT.name(),
                                                                CompanyRole.MANAGER_HR.name(),
                                                                CompanyRole.MANAGER_ACCOUNTING.name())
                                                .requestMatchers("/api/attendance/my/**").authenticated()
                                                .requestMatchers("/api/salaries/my/**").authenticated()
                                                .requestMatchers("/api/leave-requests/my/**").authenticated()
                                                .requestMatchers("/api/leave-requests/**")
                                                .hasAnyRole(CompanyRole.EMPLOYEE.name(), CompanyRole.MANAGER_HR.name(),
                                                                CompanyRole.MANAGER_ACCOUNTING.name(),
                                                                CompanyRole.MANAGER_PROJECT.name())

                                                // ===== CHAT & MEETINGS =====
                                                .requestMatchers("/api/chat/**").hasAnyRole(ALL_EMPLOYEES)
                                                .requestMatchers("/api/meetings/**").hasAnyRole(ALL_EMPLOYEES)

                                                // ===== CALENDAR =====
                                                .requestMatchers("/api/calendar/**").hasAnyRole(ALL_EMPLOYEES)

                                                // ===== STORAGE (with SYSTEM_ADMIN for logo upload) =====
                                                .requestMatchers("/api/storage/**")
                                                .hasAnyRole(CompanyRole.OWNER.name(), CompanyRole.ADMIN.name(),
                                                                CompanyRole.EMPLOYEE.name(),
                                                                CompanyRole.MANAGER_HR.name(),
                                                                CompanyRole.MANAGER_ACCOUNTING.name(),
                                                                CompanyRole.MANAGER_PROJECT.name(), SYSTEM_ADMIN)

                                                // ===== AI CHATBOT =====
                                                .requestMatchers("/api/ai/**").hasAnyRole(ALL_EMPLOYEES)

                                                // ===== NOTIFICATIONS =====
                                                .requestMatchers("/api/notifications/**").authenticated()

                                                // All other requests require authentication
                                                .anyRequest().authenticated())
                                .formLogin(form -> form.disable())
                                .httpBasic(basic -> basic.disable())
                                .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
                                .addFilterBefore(securityHeadersFilter, RateLimitFilter.class)
                                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                                .addFilterAfter(tenantFilter, jwtAuthenticationFilter.getClass());

                return http.build();
        }

        @Value("${cors.allowed-origins:*}")
        private List<String> allowedOrigins;

        @Value("${cors.allowed-methods:GET,POST,PUT,DELETE,PATCH,OPTIONS}")
        private List<String> allowedMethods;

        @Value("${cors.allowed-headers:*}")
        private List<String> allowedHeaders;

        @Bean
        public CorsConfigurationSource corsConfigurationSource() {
                CorsConfiguration configuration = new CorsConfiguration();

                // Configurable CORS policies
                // Default in app.properties:
                // http://localhost:3000,http://localhost:4200,http://localhost:5173
                configuration.setAllowedOrigins(allowedOrigins);
                configuration.setAllowedMethods(allowedMethods);
                configuration.setAllowedHeaders(allowedHeaders);
                configuration.setAllowCredentials(true);

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                source.registerCorsConfiguration("/**", configuration);
                return source;
        }
}