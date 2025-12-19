package DoAn.BE.ai.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.*;

/**
 * Entity lưu trữ từng tin nhắn trong cuộc hội thoại AI
 */
@Entity
@Table(name = "ai_messages")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AIMessage {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "message_id")
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    private AIConversation conversation;
    
    @Column(nullable = false, length = 20)
    private String role;  // "user" hoặc "assistant" hoặc "system"
    
    @Column(nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String content;
    
    @Column(name = "action_type", length = 50)
    private String actionType;  // Loại hành động (CHAT, SUMMARIZE, etc.)
    
    @Column(name = "tokens_used")
    private Integer tokensUsed;
    
    @Column(name = "model_used", length = 50)
    private String modelUsed;
    
    @Column(name = "response_time_ms")
    private Long responseTimeMs;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
    
    // Helper methods
    public boolean isUserMessage() {
        return "user".equals(this.role);
    }
    
    public boolean isAssistantMessage() {
        return "assistant".equals(this.role);
    }
    
    public boolean isSystemMessage() {
        return "system".equals(this.role);
    }
    
    // Static factory methods
    public static AIMessage userMessage(String content) {
        return AIMessage.builder()
                .role("user")
                .content(content)
                .build();
    }
    
    public static AIMessage assistantMessage(String content) {
        return AIMessage.builder()
                .role("assistant")
                .content(content)
                .build();
    }
    
    public static AIMessage systemMessage(String content) {
        return AIMessage.builder()
                .role("system")
                .content(content)
                .build();
    }
}
