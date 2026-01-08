package DoAn.BE.company.entity;

import java.time.LocalDateTime;

import DoAn.BE.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import org.hibernate.annotations.Filter;

// Entity liên kết Người dùng với Công ty (1 người dùng có thể tham gia nhiều công ty)
@Entity
@Table(name = "company_members", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "user_id", "company_id" })
}, indexes = {
        // Index cho query: findByUser_UserIdAndIsActiveTrue (Login, Profile)
        @jakarta.persistence.Index(name = "idx_cm_user_active", columnList = "user_id, is_active"),
        // Index cho query: findByCompany_CompanyIdAndIsActiveTrue (Member List)
        @jakarta.persistence.Index(name = "idx_cm_company_active", columnList = "company_id, is_active"),
        // Index cho query: findByCompany_CompanyIdAndRoleAndIsActiveTrue (Role lookups)
        @jakarta.persistence.Index(name = "idx_cm_company_role_active", columnList = "company_id, role, is_active")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Filter(name = "tenantFilter", condition = "company_id = :companyId")
public class CompanyMember extends DoAn.BE.common.entity.BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Enumerated(EnumType.STRING)
    @Column(length = 30, nullable = false)
    private CompanyRole role;

    // Quyền hạn chi tiết (JSON)
    @Convert(converter = UserPermissionsConverter.class)
    @Column(columnDefinition = "NVARCHAR(MAX)")
    private UserPermissions permissions;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "joined_at")
    private LocalDateTime joinedAt;

    @Column(name = "invited_at")
    private LocalDateTime invitedAt;

    @Column(name = "invited_by", length = 100)
    private String invitedBy;

    // BaseEntity handles createdAt/updatedAt

    @PrePersist
    protected void initDefaults() {
        if (this.joinedAt == null) {
            this.joinedAt = LocalDateTime.now();
        }
        if (this.permissions == null) {
            this.permissions = new UserPermissions();
        }
    }
}
