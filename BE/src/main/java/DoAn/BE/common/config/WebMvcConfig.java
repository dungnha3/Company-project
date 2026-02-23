package DoAn.BE.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.web.filter.CharacterEncodingFilter;
import org.springframework.web.servlet.config.annotation.ContentNegotiationConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

// WebMvcConfig - Cấu hình MVC cho ứng dụng
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final DoAn.BE.common.interceptor.TenantFilterInterceptor tenantFilterInterceptor;
    private final DoAn.BE.common.interceptor.FeatureFlagInterceptor featureFlagInterceptor;

    public WebMvcConfig(
            DoAn.BE.common.interceptor.TenantFilterInterceptor tenantFilterInterceptor,
            DoAn.BE.common.interceptor.FeatureFlagInterceptor featureFlagInterceptor) {
        this.tenantFilterInterceptor = tenantFilterInterceptor;
        this.featureFlagInterceptor = featureFlagInterceptor;
    }

    @Override
    public void addInterceptors(
            @org.springframework.lang.NonNull org.springframework.web.servlet.config.annotation.InterceptorRegistry registry) {
        // TenantFilter runs first to set company context
        registry.addInterceptor(tenantFilterInterceptor);
        // FeatureFlagInterceptor runs after to check if feature is enabled for company
        registry.addInterceptor(featureFlagInterceptor);
    }

    @Override
    public void configureContentNegotiation(@org.springframework.lang.NonNull ContentNegotiationConfigurer configurer) {
        // Đảm bảo JSON là default content type
        configurer.defaultContentType(MediaType.APPLICATION_JSON);
    }

    @Bean
    public CharacterEncodingFilter characterEncodingFilter() {
        CharacterEncodingFilter filter = new CharacterEncodingFilter();
        filter.setEncoding("UTF-8");
        filter.setForceEncoding(true);
        return filter;
    }
}
