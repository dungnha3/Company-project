package DoAn.BE.ai.dto;

import java.time.LocalDateTime;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO cho lịch sử hội thoại AI
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AIConversationDTO {
    
    private String conversationId;
    private Long userId;
    private String username;
    private Long projectId;
    private String projectName;
    private String title;
    private LocalDateTime createdAt;
    private LocalDateTime lastMessageAt;
    private Integer messageCount;
    private List<AIMessageDTO> messages;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AIMessageDTO {
        private Long messageId;
        private String role;            // user hoặc assistant
        private String content;
        private LocalDateTime timestamp;
        private String actionType;
    }
}
