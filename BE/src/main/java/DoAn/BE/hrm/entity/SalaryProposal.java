package DoAn.BE.hrm.entity;

import DoAn.BE.common.entity.TenantScopedEntity;
import DoAn.BE.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "salary_proposals")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = false)
public class SalaryProposal extends TenantScopedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "proposal_id")
    @EqualsAndHashCode.Include
    private Long proposalId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "current_salary", precision = 15, scale = 2)
    private BigDecimal currentSalary;

    @Column(name = "proposed_salary", precision = 15, scale = 2, nullable = false)
    private BigDecimal proposedSalary;

    @Column(name = "reason", columnDefinition = "NVARCHAR(MAX)")
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ProposalStatus status = ProposalStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy;

    @Column(name = "review_date")
    private LocalDate reviewDate;

    // Optional link to project if the proposal is strictly triggered by project performance
    @Column(name = "project_id")
    private Long projectId;

    public enum ProposalStatus {
        PENDING, APPROVED, REJECTED
    }
}
