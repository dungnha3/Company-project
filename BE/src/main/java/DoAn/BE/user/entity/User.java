package DoAn.BE.user.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;
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
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = { "memberships", "employees" })
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

    @Column(name = "username", nullable = false, length = 50, unique = true)
    private String username;

    @Column(name = "full_name", length = 100)
    private String fullName;

    @Column(name = "password_hash", nullable = false, length = 255)
    @JsonIgnore
    private String passwordHash;

    @Column(name = "email", unique = true, length = 100)
    private String email;

    @Column(name = "phone_number", length = 15)
    private String phoneNumber;

    @Column(name = "avatar_data", columnDefinition = "TEXT")
    private String avatarUrl;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    // [SAAS] System Admin Flag (Quản trị viên hệ thống toàn cục)
    @Builder.Default
    @Column(name = "is_system_admin", nullable = false)
    private Boolean isSystemAdmin = false;

    @Column(name = "last_login")
    private LocalDateTime lastLogin;

    @Builder.Default
    @Column(name = "is_online", nullable = false)
    private Boolean isOnline = false;

    @Column(name = "last_seen")
    private LocalDateTime lastSeen;

    @Column(name = "fcm_token", length = 500, columnDefinition = "TEXT")
    @JsonIgnore
    private String fcmToken;

    @Column(name = "two_factor_secret")
    @JsonIgnore
    private String twoFactorSecret;

    @Column(name = "two_factor_enabled")
    @Builder.Default
    private Boolean twoFactorEnabled = false;

    @Column(name = "two_factor_backup_codes", length = 500)
    @JsonIgnore
    private String twoFactorBackupCodes;

    @jakarta.persistence.Embedded
    @Builder.Default
    private NotificationSettings notificationSettings = new NotificationSettings();

    @OneToMany(mappedBy = "user")
    @BatchSize(size = 20)
    @Builder.Default
    @JsonIgnore
    private List<CompanyMember> memberships = new ArrayList<>();





    @OneToMany(mappedBy = "user", fetch = jakarta.persistence.FetchType.LAZY)
    @JsonIgnore
    @Builder.Default
    private List<DoAn.BE.hrm.entity.Employee> employees = new ArrayList<>();

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
    @JsonIgnore
    private String activationToken;

    // Reset password
    @Column(name = "reset_password_token", length = 100)
    @JsonIgnore
    private String resetPasswordToken;

    @Column(name = "reset_password_token_expiry")
    @JsonIgnore
    private LocalDateTime resetPasswordTokenExpiry;

    // Enum trạng thái user
    public enum UserStatus {
        ACTIVE,
        INACTIVE, // Banned or disabled
        PENDING_ACTIVATION // Waiting for email verification
    }

    // --- Helper methods for Firebase Sync ---
    public String getFullName() {
        return (fullName != null && !fullName.isBlank()) ? fullName : username;
    }

    @JsonIgnore
    public List<CompanyMember> getCompanyMemberships() {
        return this.memberships;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o)
            return true;
        if (!(o instanceof User other))
            return false;
        return userId != null && userId.equals(other.getUserId());
    }

    @Override
    public int hashCode() {
        return getClass().hashCode(); // Consistent before and after persist
    }
}
