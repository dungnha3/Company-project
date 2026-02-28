package DoAn.BE.notification.entity;

import java.time.LocalDateTime;

import DoAn.BE.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "notifications", indexes = {
        // Index cho query: findByUser_UserId (User's notifications - CRITICAL)
        @jakarta.persistence.Index(name = "idx_notif_user", columnList = "user_id"),
        // Index cho query: findByIsRead (Unread filter)
        @jakarta.persistence.Index(name = "idx_notif_read", columnList = "is_read"),
        // Index cho query: findByType (Type filter)
        @jakarta.persistence.Index(name = "idx_notif_type", columnList = "type"),
        // Index cho query: findByCreatedAt (Pagination by time)
        @jakarta.persistence.Index(name = "idx_notif_created", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "notification_id")
    @EqualsAndHashCode.Include
    private Long notificationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "type", nullable = false, length = 50, columnDefinition = "NVARCHAR(50)")
    private String type;

    @Column(name = "title", nullable = false, length = 255, columnDefinition = "NVARCHAR(255)")
    private String title;

    @Column(name = "content", length = 500, columnDefinition = "NVARCHAR(500)")
    private String content;

    @Column(name = "link", length = 500, columnDefinition = "NVARCHAR(500)")
    private String link;

    @Column(name = "is_read", nullable = false)
    private Boolean isRead = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "priority", length = 20)
    @jakarta.persistence.Enumerated(jakarta.persistence.EnumType.STRING)
    private NotificationPriority priority = NotificationPriority.NORMAL;

    @Column(name = "metadata", columnDefinition = "TEXT")
    private String metadata;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.priority == null) {
            this.priority = NotificationPriority.NORMAL;
        }
    }

    // Constructor tiện lợi cho thông báo chung
    public Notification(User user, String title, String content) {
        this.user = user;
        this.type = NotificationType.SYSTEM_ALERT.name();
        this.title = title;
        this.content = content;
        this.priority = NotificationPriority.NORMAL;
    }

    public void markAsRead() {
        this.isRead = true;
    }

    public boolean isUnread() {
        return !this.isRead;
    }
}
