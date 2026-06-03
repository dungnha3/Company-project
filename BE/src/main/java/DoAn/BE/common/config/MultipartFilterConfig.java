package DoAn.BE.common.config;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.filter.FormContentFilter;

/**
 * Disable Spring's FormContentFilter for multipart/form-data requests.
 * FormContentFilter consumes the request body (to parse URL-encoded params),
 * which breaks multipart parsing downstream when file parts are sent.
 */
@Configuration
public class MultipartFilterConfig {

    @Bean
    public FilterRegistrationBean<FormContentFilter> formContentFilterRegistration() {
        FilterRegistrationBean<FormContentFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new FormContentFilter() {
            @Override
            public boolean shouldNotFilter(jakarta.servlet.http.HttpServletRequest request) {
                String ct = request.getContentType();
                return ct != null && ct.toLowerCase().contains("multipart/form-data");
            }
        });
        registration.addUrlPatterns("/*");
        registration.setOrder(org.springframework.core.Ordered.LOWEST_PRECEDENCE - 1);
        return registration;
    }
}
