package DoAn.BE.notification.entity;

import java.time.LocalDateTime;

import DoAn.BE.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// Entity thông báo đơn giản (dùng cho chat, general notifications)
@Entity
@Table(name = "notifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Notification {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "notification_id")
    private Long notificationId;

    @ManyToOne
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

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    // Constructor tiện lợi cho thông báo chung
    public Notification(User user, String title, String content) {
        this.user = user;
        this.type = "GENERAL";
        this.title = title;
        this.content = content;
    }

    // Đánh dấu đã đọc
    public void markAsRead() {
        this.isRead = true;
    }

    // Kiểm tra chưa đọc
    public boolean isUnread() {
        return !this.isRead;
    }
}
