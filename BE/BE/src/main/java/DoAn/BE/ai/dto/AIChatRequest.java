package DoAn.BE.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO cho request chat với AI Assistant
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AIChatRequest {
    
    @NotBlank(message = "Tin nhắn không được để trống")
    @Size(max = 4000, message = "Tin nhắn không được vượt quá 4000 ký tự")
    private String message;
    
    // ID của conversation hiện tại (null nếu bắt đầu cuộc hội thoại mới)
    private String conversationId;
    
    // ID của project đang làm việc (context)
    private Long projectId;
    
    // Loại hành động AI cần thực hiện
    private AIActionType actionType = AIActionType.CHAT;
    
    // Enum các loại hành động AI có thể thực hiện
    public enum AIActionType {
        CHAT,                    // Hội thoại thông thường
        SUMMARIZE_PROJECT,       // Tóm tắt dự án
        SUMMARIZE_SPRINT,        // Tóm tắt sprint
        SUGGEST_TASKS,           // Gợi ý công việc
        ANALYZE_PROGRESS,        // Phân tích tiến độ
        GENERATE_REPORT,         // Tạo báo cáo
        CREATE_ISSUE,            // Tạo issue mới (từ mô tả)
        BRAINSTORM,              // Brainstorm ý tưởng
        HELP                     // Hướng dẫn sử dụng
    }
}
