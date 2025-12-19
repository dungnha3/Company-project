package DoAn.BE.ai.dto;

import java.time.LocalDateTime;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO cho response từ AI Assistant
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AIChatResponse {
    
    private String conversationId;
    private String message;
    private String formattedMessage;  // Message với Markdown formatting
    private LocalDateTime timestamp;
    private ResponseType responseType;
    private List<SuggestedAction> suggestedActions;
    private List<AIActionDTO> executableActions;  // Actions có thể thực thi (tạo project, task...)
    private AIMetadata metadata;
    
    // Loại response
    public enum ResponseType {
        TEXT,           // Response dạng text thông thường
        MARKDOWN,       // Response có Markdown formatting
        STRUCTURED,     // Response có cấu trúc (bảng, danh sách)
        ACTION_RESULT,  // Kết quả của một hành động
        ERROR           // Thông báo lỗi
    }
    
    // Gợi ý hành động tiếp theo
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SuggestedAction {
        private String label;           // Text hiển thị
        private String actionType;      // Loại hành động
        private String actionPayload;   // Dữ liệu cho hành động
    }
    
    // Metadata về AI response
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AIMetadata {
        private String model;           // Model được sử dụng
        private Integer tokensUsed;     // Số tokens đã dùng
        private Long responseTimeMs;    // Thời gian phản hồi
        private String contextUsed;     // Context đã sử dụng
    }
}
