package DoAn.BE.user.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entity cho yêu cầu thay đổi role của user
 * HR Manager có thể gửi yêu cầu lên Admin để duyệt
 */
@Entity
@Table(name = "role_change_requests")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RoleChangeRequest {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "request_id")
    private Long requestId;
    
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User targetUser; // User cần thay đổi role
    
    @Enumerated(EnumType.STRING)
    @Column(name = "current_role", nullable = false, length = 30)
    private User.Role currentRole;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "requested_role", nullable = false, length = 30)
    private User.Role requestedRole;
    
    @ManyToOne
    @JoinColumn(name = "requested_by", nullable = false)
    private User requestedBy; // HR Manager gửi yêu cầu
    
    @Column(name = "reason", length = 500)
    private String reason;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private RequestStatus status = RequestStatus.PENDING;
    
    @ManyToOne
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy; // Admin duyệt
    
    @Column(name = "review_note", length = 500)
    private String reviewNote;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;
    
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
    
    public void approve(User admin, String note) {
        this.status = RequestStatus.APPROVED;
        this.reviewedBy = admin;
        this.reviewNote = note;
        this.reviewedAt = LocalDateTime.now();
    }
    
    public void reject(User admin, String note) {
        this.status = RequestStatus.REJECTED;
        this.reviewedBy = admin;
        this.reviewNote = note;
        this.reviewedAt = LocalDateTime.now();
    }
    
    public enum RequestStatus {
        PENDING,
        APPROVED,
        REJECTED
    }
}
