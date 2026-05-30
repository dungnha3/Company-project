package DoAn.BE.company.entity;

import DoAn.BE.common.entity.TenantScopedEntity;
import DoAn.BE.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "workspace_join_requests",
    uniqueConstraints = @UniqueConstraint(columnNames = {"company_id", "user_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class WorkspaceJoinRequest extends TenantScopedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "request_id")
    private Long requestId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 20)
    private String status = "PENDING"; // PENDING, APPROVED, REJECTED

    @Column(name = "reviewed_by")
    private Long reviewedBy; // userId của người duyệt

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof WorkspaceJoinRequest other)) return false;
        return requestId != null && requestId.equals(other.requestId);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
