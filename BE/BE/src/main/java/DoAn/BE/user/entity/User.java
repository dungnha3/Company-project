package DoAn.BE.user.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import DoAn.BE.company.entity.CompanyMember;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.SQLRestriction;

// Entity User - Tài khoản đăng nhập hệ thống (multi-tenant qua CompanyMember)
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true)
@ToString(exclude = { "memberships" }) // [FIX] Exclude lazy collection to prevent circular
                                       // ToString
@Table(name = "users", indexes = {
        // Index cho query: findByIsOnlineTrue (Presence check)
        @jakarta.persistence.Index(name = "idx_user_online", columnList = "is_online"),
        // Index cho query: findByIsActiveTrue (Active user list)
        @jakarta.persistence.Index(name = "idx_user_active", columnList = "is_active"),
        // Index cho query: findByIsOnlineTrueAndLastSeenBefore (Cleanup inactive)
        @jakarta.persistence.Index(name = "idx_user_online_lastseen", columnList = "is_online, last_seen")
})
@SQLRestriction("is_deleted = false")
public class User extends DoAn.BE.common.entity.BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "username", nullable = false, length = 50, unique = true, columnDefinition = "NVARCHAR(50)")
    private String username;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "email", unique = true, length = 100, columnDefinition = "NVARCHAR(100)")
    private String email;

    @Column(name = "phone_number", length = 15, columnDefinition = "NVARCHAR(15)")
    private String phoneNumber;

    @Column(name = "avatar_data", columnDefinition = "NVARCHAR(MAX)")
    private String avatarUrl;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    // [SAAS] System Admin Flag (Quản trị viên hệ thống toàn cục)
    @Builder.Default
    @Column(name = "is_system_admin", nullable = false, columnDefinition = "bit default 0")
    private Boolean isSystemAdmin = false;

    // createdAt and updatedAt are now inherited from BaseEntity

    @Column(name = "last_login")
    private LocalDateTime lastLogin;

    @Builder.Default
    @Column(name = "is_online", nullable = false)
    private Boolean isOnline = false;

    @Column(name = "last_seen")
    private LocalDateTime lastSeen;

    @Column(name = "fcm_token", length = 500, columnDefinition = "NVARCHAR(500)")
    private String fcmToken;

    // Multi-tenant: User có thể join nhiều công ty
    @OneToMany(mappedBy = "user")
    @BatchSize(size = 20) // N+1 Fix: Fetch memberships in batches
    @Builder.Default
    private List<CompanyMember> memberships = new ArrayList<>();

    // Personal Workspace (1:1) - Không gian làm việc cá nhân
    @jakarta.persistence.OneToOne(mappedBy = "user", fetch = jakarta.persistence.FetchType.LAZY, cascade = jakarta.persistence.CascadeType.ALL)
    private PersonalWorkspace personalWorkspace;

    // Personal Plan - Gói cước cá nhân (independent of company plans)
    @Column(name = "personal_plan", length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private DoAn.BE.company.entity.Plan personalPlan = DoAn.BE.company.entity.Plan.FREE;

    // Relation with Employee (New)
    @jakarta.persistence.OneToOne(mappedBy = "user", fetch = jakarta.persistence.FetchType.LAZY)
    private DoAn.BE.hrm.entity.Employee employee;

    // Đặt trạng thái online
    public void setOnline() {
        this.isOnline = true;
        this.lastSeen = LocalDateTime.now();
    }

    // Đặt trạng thái offline
    public void setOffline() {
        this.isOnline = false;
        this.lastSeen = LocalDateTime.now();
    }

    // Kiểm tra user đang online
    public boolean isCurrentlyOnline() {
        return this.isOnline != null && this.isOnline;
    }

    // Check System Admin
    public boolean isSystemAdminAccount() {
        return Boolean.TRUE.equals(this.isSystemAdmin);
    }

    @Column(name = "presence_status", length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private PresenceStatus presenceStatus = PresenceStatus.ONLINE;

    public enum PresenceStatus {
        ONLINE,
        BUSY,
        IN_MEETING,
        OFFLINE
    }

    // PrePersist/PreUpdate methods for createdAt/updatedAt are handled by
    // BaseEntity

    @Column(name = "status", length = 30)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private UserStatus status = UserStatus.ACTIVE;

    @Column(name = "activation_token", length = 100)
    private String activationToken;

    // Reset password
    @Column(name = "reset_password_token", length = 100)
    private String resetPasswordToken;

    @Column(name = "reset_password_token_expiry")
    private LocalDateTime resetPasswordTokenExpiry;

    // Enum trạng thái user
    public enum UserStatus {
        ACTIVE,
        INACTIVE, // Banned or disabled
        PENDING_ACTIVATION // Waiting for email verification
    }

    // --- Helper methods for Firebase Sync ---
    public String getFullName() {
        return this.username;
    }

    public List<CompanyMember> getCompanyMemberships() {
        return this.memberships;
    }
}
