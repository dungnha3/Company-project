package DoAn.BE.ai.service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import DoAn.BE.ai.config.GeminiConfig;
import DoAn.BE.ai.entity.AIMessage;
import lombok.extern.slf4j.Slf4j;

/**
 * Service để gọi Google Gemini API
 */
@Service
@Slf4j
public class GeminiService {
    
    private final WebClient webClient;
    private final GeminiConfig config;
    
    @Autowired
    public GeminiService(@Autowired(required = false) WebClient geminiWebClient, GeminiConfig config) {
        this.webClient = geminiWebClient;
        this.config = config;
    }
    
    /**
     * Gửi chat request đến Gemini và nhận response
     */
    public GeminiResponse chat(String systemPrompt, List<AIMessage> conversationHistory, String userMessage) {
        if (!isAvailable()) {
            log.error("Gemini service is not available. Config: {}, WebClient: {}", 
                    config.isConfigured(), webClient != null);
            throw new RuntimeException("AI service chưa được cấu hình. Vui lòng thiết lập GEMINI_API_KEY.");
        }
        
        // Build request body
        Map<String, Object> requestBody = buildRequestBody(systemPrompt, conversationHistory, userMessage);
        
        log.debug("Sending request to Gemini API");
        
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = webClient.post()
                    .uri(config.buildApiUrl())
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(config.getTimeout()))
                    .block();
            
            return parseResponse(response);
            
        } catch (WebClientResponseException e) {
            log.error("Gemini API error: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            handleApiError(e);
            throw new RuntimeException("Lỗi khi gọi AI: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("Error calling Gemini API: {} - {}", e.getMessage(), e.getClass().getName());
            throw new RuntimeException("Lỗi khi gọi AI: " + e.getMessage(), e);
        }
    }
    
    /**
     * Chat đơn giản không có conversation history
     */
    public String simpleChat(String systemPrompt, String userMessage) {
        GeminiResponse response = chat(systemPrompt, new ArrayList<>(), userMessage);
        return response.getContent();
    }
    
    /**
     * Kiểm tra Gemini service có sẵn không
     */
    public boolean isAvailable() {
        return config.isConfigured() && webClient != null;
    }
    
    /**
     * Build request body cho Gemini API
     */
    private Map<String, Object> buildRequestBody(String systemPrompt, List<AIMessage> conversationHistory, String userMessage) {
        Map<String, Object> body = new HashMap<>();
        
        // System instruction
        Map<String, Object> systemInstruction = new HashMap<>();
        Map<String, String> systemParts = new HashMap<>();
        systemParts.put("text", systemPrompt);
        systemInstruction.put("parts", List.of(systemParts));
        body.put("systemInstruction", systemInstruction);
        
        // Contents (conversation history + current message)
        List<Map<String, Object>> contents = new ArrayList<>();
        
        // Add conversation history
        int historyLimit = config.getMaxConversationHistory();
        int startIndex = Math.max(0, conversationHistory.size() - historyLimit);
        
        for (int i = startIndex; i < conversationHistory.size(); i++) {
            AIMessage msg = conversationHistory.get(i);
            Map<String, Object> content = new HashMap<>();
            content.put("role", msg.getRole().equals("user") ? "user" : "model");
            
            Map<String, String> parts = new HashMap<>();
            parts.put("text", msg.getContent());
            content.put("parts", List.of(parts));
            
            contents.add(content);
        }
        
        // Add current user message
        Map<String, Object> userContent = new HashMap<>();
        userContent.put("role", "user");
        Map<String, String> userParts = new HashMap<>();
        userParts.put("text", userMessage);
        userContent.put("parts", List.of(userParts));
        contents.add(userContent);
        
        body.put("contents", contents);
        
        // Generation config
        Map<String, Object> generationConfig = new HashMap<>();
        generationConfig.put("temperature", config.getTemperature());
        generationConfig.put("maxOutputTokens", config.getMaxTokens());
        generationConfig.put("topP", 0.95);
        generationConfig.put("topK", 40);
        body.put("generationConfig", generationConfig);
        
        // Safety settings (allow all for project management content)
        List<Map<String, String>> safetySettings = List.of(
            Map.of("category", "HARM_CATEGORY_HARASSMENT", "threshold", "BLOCK_NONE"),
            Map.of("category", "HARM_CATEGORY_HATE_SPEECH", "threshold", "BLOCK_NONE"),
            Map.of("category", "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold", "BLOCK_NONE"),
            Map.of("category", "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold", "BLOCK_NONE")
        );
        body.put("safetySettings", safetySettings);
        
        return body;
    }
    
    /**
     * Parse response từ Gemini API
     */
    @SuppressWarnings("unchecked")
    private GeminiResponse parseResponse(Map<String, Object> response) {
        if (response == null) {
            return new GeminiResponse("Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này.", 0);
        }
        
        try {
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
            if (candidates != null && !candidates.isEmpty()) {
                Map<String, Object> candidate = candidates.get(0);
                Map<String, Object> content = (Map<String, Object>) candidate.get("content");
                List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
                
                if (parts != null && !parts.isEmpty()) {
                    String text = (String) parts.get(0).get("text");
                    
                    // Get token count from usage metadata
                    int tokensUsed = 0;
                    Map<String, Object> usageMetadata = (Map<String, Object>) response.get("usageMetadata");
                    if (usageMetadata != null) {
                        Object totalTokens = usageMetadata.get("totalTokenCount");
                        if (totalTokens instanceof Number) {
                            tokensUsed = ((Number) totalTokens).intValue();
                        }
                    }
                    
                    log.info("Received response from Gemini: {} tokens used", tokensUsed);
                    return new GeminiResponse(text, tokensUsed);
                }
            }
            
            // Check for blocked response
            if (response.containsKey("promptFeedback")) {
                Map<String, Object> feedback = (Map<String, Object>) response.get("promptFeedback");
                String blockReason = (String) feedback.get("blockReason");
                if (blockReason != null) {
                    log.warn("Response blocked: {}", blockReason);
                    return new GeminiResponse("Xin lỗi, yêu cầu của bạn không thể được xử lý. Vui lòng thử lại với nội dung khác.", 0);
                }
            }
            
        } catch (Exception e) {
            log.error("Error parsing Gemini response: {}", e.getMessage());
        }
        
        return new GeminiResponse("Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này.", 0);
    }
    
    /**
     * Handle API errors
     */
    private void handleApiError(WebClientResponseException e) {
        String errorBody = e.getResponseBodyAsString();
        int statusCode = e.getStatusCode().value();
        
        if (statusCode == 400) {
            if (errorBody.contains("API_KEY_INVALID")) {
                throw new RuntimeException("API key không hợp lệ. Vui lòng kiểm tra GEMINI_API_KEY.", e);
            }
        } else if (statusCode == 429) {
            throw new RuntimeException("Đã vượt quá giới hạn API. Vui lòng thử lại sau.", e);
        } else if (statusCode == 403) {
            throw new RuntimeException("Không có quyền truy cập API. Vui lòng kiểm tra API key.", e);
        }
    }
    
    /**
     * Response wrapper class
     */
    public static class GeminiResponse {
        private final String content;
        private final int tokensUsed;
        
        public GeminiResponse(String content, int tokensUsed) {
            this.content = content;
            this.tokensUsed = tokensUsed;
        }
        
        public String getContent() {
            return content;
        }
        
        public int getTokensUsed() {
            return tokensUsed;
        }
    }
}
