package DoAn.BE.user.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// Entity User - Tài khoản đăng nhập hệ thống với role-based access control
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "users")
public class User {
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

    // Enum Role: ADMIN / MANAGER / EMPLOYEE
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 30)
    private Role role;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "last_login")
    private LocalDateTime lastLogin;

    @Column(name = "is_online", nullable = false)
    private Boolean isOnline = false;

    @Column(name = "last_seen")
    private LocalDateTime lastSeen;

    @Column(name = "fcm_token", length = 500, columnDefinition = "NVARCHAR(500)")
    private String fcmToken;

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

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Enum định nghĩa quyền
    public enum Role {
        ADMIN, // Quản trị hệ thống - quản lý user, không truy cập dữ liệu công ty
        MANAGER_HR, // Quản lý nhân sự - quản lý nhân viên, lương, hợp đồng
        MANAGER_ACCOUNTING, // Quản lý kế toán - tính lương, chấm công, xuất báo cáo
        MANAGER_PROJECT, // Quản lý dự án - quản lý dự án của mình
        EMPLOYEE // Nhân viên - quyền cơ bản
    }

    // Helper methods để kiểm tra role
    public boolean isAdmin() {
        return this.role == Role.ADMIN;
    }

    public boolean isManagerHR() {
        return this.role == Role.MANAGER_HR;
    }

    public boolean isManagerAccounting() {
        return this.role == Role.MANAGER_ACCOUNTING;
    }

    public boolean isManagerProject() {
        return this.role == Role.MANAGER_PROJECT;
    }

    public boolean isEmployee() {
        return this.role == Role.EMPLOYEE;
    }

    public boolean isAnyManager() {
        return this.role == Role.MANAGER_HR ||
                this.role == Role.MANAGER_ACCOUNTING ||
                this.role == Role.MANAGER_PROJECT;
    }
}
