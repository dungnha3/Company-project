package DoAn.BE.hrm.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

import DoAn.BE.common.entity.TenantScopedEntity;
import org.hibernate.annotations.Filter;

// Contract entity - renamed from HopDong

// Labor contract management
@Entity
@Table(name = "contracts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Filter(name = "tenantFilter", condition = "company_id = :companyId")
public class Contract extends TenantScopedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "contract_id")
    private Long contractId;

    @ManyToOne
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Enumerated(EnumType.STRING)
    @Column(name = "contract_type", nullable = false, length = 50)
    private ContractType contractType;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "salary", nullable = false, precision = 15, scale = 2)
    private BigDecimal salary;

    @Column(name = "content", columnDefinition = "NVARCHAR(MAX)")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 30)
    private ContractStatus status = ContractStatus.ACTIVE;

    public boolean isExpired() {
        return endDate != null && endDate.isBefore(LocalDate.now());
    }

    public enum ContractType {
        PROBATION, // THU_VIEC
        FIXED_TERM, // XAC_DINH
        INDEFINITE // VO_THOI_HAN
    }

    public enum ContractStatus {
        ACTIVE, // HIEU_LUC
        EXPIRED, // HET_HAN
        CANCELLED // BI_HUY
    }

}
