package DoAn.BE.user.entity;

import DoAn.BE.company.entity.Company;
import DoAn.BE.company.entity.CompanyRole;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import DoAn.BE.common.entity.BaseEntity;

@Entity
@Table(name = "role_change_requests", indexes = {
        @Index(name = "idx_rcr_company", columnList = "company_id"),
        @Index(name = "idx_rcr_status", columnList = "status")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class RoleChangeRequest extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "request_id")
    private Long requestId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Enumerated(EnumType.STRING)
    @Column(name = "current_role", nullable = false)
    private CompanyRole currentRole;

    @Enumerated(EnumType.STRING)
    @Column(name = "requested_role", nullable = false)
    private CompanyRole requestedRole;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RequestStatus status = RequestStatus.PENDING;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(name = "admin_note", columnDefinition = "TEXT")
    private String adminNote;

    public enum RequestStatus {
        PENDING,
        APPROVED,
        REJECTED
    }
}
