package DoAn.BE.ai.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnore;

import DoAn.BE.project.entity.Project;
import DoAn.BE.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

/**
 * Entity lưu trữ cuộc hội thoại với AI Assistant
 */
@Entity
@Table(name = "ai_conversations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AIConversation {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "conversation_id")
    private Long id;
    
    @Column(name = "conversation_uuid", nullable = false, unique = true, length = 36)
    private String conversationUuid;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;
    
    @Column(length = 255, columnDefinition = "NVARCHAR(255)")
    private String title;
    
    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @Column(name = "last_message_at")
    private LocalDateTime lastMessageAt;
    
    @Builder.Default
    @OneToMany(mappedBy = "conversation", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonIgnore
    @OrderBy("createdAt ASC")
    private List<AIMessage> messages = new ArrayList<>();
    
    @PrePersist
    protected void onCreate() {
        if (this.conversationUuid == null) {
            this.conversationUuid = UUID.randomUUID().toString();
        }
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        this.lastMessageAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
    
    // Helper methods
    public void addMessage(AIMessage message) {
        messages.add(message);
        message.setConversation(this);
        this.lastMessageAt = LocalDateTime.now();
    }
    
    public int getMessageCount() {
        return messages != null ? messages.size() : 0;
    }
    
    public AIMessage getLastMessage() {
        if (messages == null || messages.isEmpty()) {
            return null;
        }
        return messages.get(messages.size() - 1);
    }
    
    // Auto-generate title from first user message
    public void generateTitleFromFirstMessage() {
        if (this.title == null && messages != null && !messages.isEmpty()) {
            for (AIMessage msg : messages) {
                if ("user".equals(msg.getRole())) {
                    String content = msg.getContent();
                    this.title = content.length() > 50 
                        ? content.substring(0, 50) + "..." 
                        : content;
                    break;
                }
            }
        }
    }
}
