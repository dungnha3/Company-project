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
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.FetchType;
import org.hibernate.annotations.BatchSize;

// Entity liên kết Người dùng với Công ty (1 người dùng có thể tham gia nhiều công ty)
@Entity
@Table(name = "company_members", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "user_id", "company_id" })
}, indexes = {
        // Index cho query: findByUser_UserIdAndIsActiveTrue (Login, Profile)
        @jakarta.persistence.Index(name = "idx_cm_user_active", columnList = "user_id, is_active"),
        // Index cho query: findByCompany_CompanyIdAndIsActiveTrue (Member List)
        @jakarta.persistence.Index(name = "idx_cm_company_active", columnList = "company_id, is_active")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
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

    @ElementCollection(fetch = FetchType.LAZY)
    @BatchSize(size = 20) // N+1 Fix: Load roles in batches
    @CollectionTable(name = "company_member_roles", joinColumns = @JoinColumn(name = "member_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "role")
    private Set<CompanyRole> roles = new HashSet<>();

    public boolean hasAnyRole(CompanyRole... checkRoles) {
        if (roles == null || roles.isEmpty())
            return false;
        for (CompanyRole r : checkRoles) {
            if (roles.contains(r))
                return true;
        }
        return false;
    }

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
    // BaseEntity handles createdAt/updatedAt via its own @PrePersist
    @Override
    public boolean equals(Object o) {
        if (this == o)
            return true;
        if (!(o instanceof CompanyMember other))
            return false;
        return id != null && id.equals(other.getId());
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
