package DoAn.BE.auth.entity;

import DoAn.BE.user.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "user_sessions", indexes = {
        // Index cho query: findByUser_UserId (User's active sessions)
        @jakarta.persistence.Index(name = "idx_us_user", columnList = "user_id"),
        // Index cho query: findByIsActive (Active session filter)
        @jakarta.persistence.Index(name = "idx_us_active", columnList = "is_active"),
        // Index cho query: findByLastActivityBefore (Session cleanup)
        @jakarta.persistence.Index(name = "idx_us_lastactivity", columnList = "last_activity")
})
public class UserSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    @EqualsAndHashCode.Include
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

    public void updateActivity() {
        this.lastActivity = LocalDateTime.now();
    }

    public boolean isExpired(int timeoutMinutes) {
        if (this.lastActivity == null)
            return true;
        return LocalDateTime.now().isAfter(this.lastActivity.plusMinutes(timeoutMinutes));
    }
}
