package DoAn.BE.auth.entity;

import DoAn.BE.user.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

// Entity quản lý session của user (đa phiên đăng nhập)
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "user_sessions")
public class UserSession {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Column(name = "session_id", nullable = false, unique = true, length = 100)
    private String sessionId;
    
    @Column(name = "ip_address", length = 45)
    private String ipAddress;
    
    @Column(name = "user_agent", length = 500)
    private String userAgent;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "last_activity")
    private LocalDateTime lastActivity;
    
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
    
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.lastActivity = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        this.lastActivity = LocalDateTime.now();
    }
    
    public void updateActivity() {
        this.lastActivity = LocalDateTime.now();
    }
    
    // Kiểm tra session đã hết hạn chưa
    public boolean isExpired(int timeoutMinutes) {
        if (this.lastActivity == null) return true;
        return LocalDateTime.now().isAfter(this.lastActivity.plusMinutes(timeoutMinutes));
    }
}
