package DoAn.BE.chat.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.*;

import DoAn.BE.user.entity.User;

// Entity lưu reaction (emoji) cho tin nhắn
// Unique constraint: 1 user chỉ được 1 emoji mỗi message
@Entity
@Table(name = "message_reactions", uniqueConstraints = @UniqueConstraint(columnNames = { "message_id", "user_id",
        "emoji" }))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@Builder
public class MessageReaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long reactionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "message_id", nullable = false)
    private Message message;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // Emoji như: 👍, ❤️, 😂, 🎉, 😢, 😠
    @Column(name = "emoji", length = 10, nullable = false)
    private String emoji;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
