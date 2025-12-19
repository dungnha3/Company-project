package DoAn.BE.ai.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

/**
 * Configuration cho Google Gemini API
 */
@Configuration
@Getter
@Slf4j
public class GeminiConfig {
    
    @Value("${gemini.api.key:}")
    private String apiKey;
    
    @Value("${gemini.api.model:gemini-1.5-flash}")
    private String model;
    
    @Value("${gemini.api.max-tokens:2000}")
    private Integer maxTokens;
    
    @Value("${gemini.api.temperature:0.7}")
    private Double temperature;
    
    @Value("${gemini.api.timeout:60}")
    private Integer timeout;
    
    @Value("${gemini.api.max-conversation-history:10}")
    private Integer maxConversationHistory;
    
    private static final String GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
    
    /**
     * Kiểm tra API key đã được cấu hình chưa
     */
    public boolean isConfigured() {
        return apiKey != null && !apiKey.isEmpty() && !apiKey.equals("your-gemini-api-key-here");
    }
    
    /**
     * Tạo WebClient để gọi Gemini API
     */
    @Bean
    public WebClient geminiWebClient() {
        if (!isConfigured()) {
            log.warn("⚠️ Gemini API key chưa được cấu hình. AI features sẽ không hoạt động.");
            log.warn("Vui lòng thiết lập GEMINI_API_KEY trong environment variables hoặc application.properties");
            return null;
        }
        
        log.info("✅ Gemini API đã được cấu hình với model: {}", model);
        
        return WebClient.builder()
                .baseUrl(GEMINI_API_BASE_URL)
                .defaultHeader("Content-Type", "application/json")
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(16 * 1024 * 1024))
                .build();
    }
    
    /**
     * Build URL cho Gemini API
     */
    public String buildApiUrl() {
        return String.format("/models/%s:generateContent?key=%s", model, apiKey);
    }
}
