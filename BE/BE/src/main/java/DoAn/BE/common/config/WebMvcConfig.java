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

    public WebMvcConfig(DoAn.BE.common.interceptor.TenantFilterInterceptor tenantFilterInterceptor) {
        this.tenantFilterInterceptor = tenantFilterInterceptor;
    }

    @Override
    public void addInterceptors(
            @org.springframework.lang.NonNull org.springframework.web.servlet.config.annotation.InterceptorRegistry registry) {
        registry.addInterceptor(tenantFilterInterceptor);
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
