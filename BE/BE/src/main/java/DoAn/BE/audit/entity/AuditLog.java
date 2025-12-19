package DoAn.BE.audit.entity;

import DoAn.BE.user.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entity lưu audit log cho các thao tác quan trọng
 * Đặc biệt: Admin actions trên tài khoản Manager
 */
@Entity
@Table(name = "audit_logs", indexes = {
    @Index(name = "idx_audit_actor", columnList = "actor_id"),
    @Index(name = "idx_audit_target", columnList = "target_user_id"),
    @Index(name = "idx_audit_action", columnList = "action"),
    @Index(name = "idx_audit_created", columnList = "created_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    // Người thực hiện hành động (thường là Admin)
    @ManyToOne
    @JoinColumn(name = "actor_id", nullable = false)
    private User actor;
    
    // Hành động (CREATE_USER, UPDATE_USER, DELETE_USER, DEACTIVATE_USER, CHANGE_ROLE, etc.)
    @Column(nullable = false, length = 50)
    private String action;
    
    // User bị tác động (nếu có)
    @ManyToOne
    @JoinColumn(name = "target_user_id")
    private User targetUser;
    
    // Entity type (USER, ROLE_REQUEST, PROJECT, etc.)
    @Column(name = "entity_type", length = 50)
    private String entityType;
    
    // Entity ID
    @Column(name = "entity_id")
    private Long entityId;
    
    // Dữ liệu trước khi thay đổi (JSON)
    @Column(name = "old_value", columnDefinition = "TEXT")
    private String oldValue;
    
    // Dữ liệu sau khi thay đổi (JSON)
    @Column(name = "new_value", columnDefinition = "TEXT")
    private String newValue;
    
    // IP address
    @Column(name = "ip_address", length = 50)
    private String ipAddress;
    
    // User Agent
    @Column(name = "user_agent", length = 500)
    private String userAgent;
    
    // Lý do (optional, cho các hành động nhạy cảm)
    @Column(columnDefinition = "NVARCHAR(1000)")
    private String reason;
    
    // Mức độ nghiêm trọng (INFO, WARNING, CRITICAL)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Severity severity = Severity.INFO;
    
    // Trạng thái (SUCCESS, FAILED)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.SUCCESS;
    
    // Chi tiết lỗi (nếu failed)
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
    
    // Enum
    public enum Severity {
        INFO,       // Thao tác bình thường
        WARNING,    // Thao tác cần lưu ý
        CRITICAL    // Thao tác nguy hiểm (delete, deactivate Manager)
    }
    
    public enum Status {
        SUCCESS,
        FAILED
    }
}
