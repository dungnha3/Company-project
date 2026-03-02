package DoAn.BE.project.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

import DoAn.BE.common.entity.TenantScopedEntity;
import DoAn.BE.hrm.entity.Employee;
import org.hibernate.annotations.Filter;

@Entity
@Table(name = "resource_allocations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = false)
@Filter(name = "tenantFilter", condition = "company_id = :companyId")
public class ResourceAllocation extends TenantScopedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "allocation_id")
    @EqualsAndHashCode.Include
    private Long allocationId;

    @ManyToOne
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne
    @JoinColumn(name = "project_id")
    private Project project;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    /** Allocation percentage (0-100) */
    @Column(name = "allocation", nullable = false)
    private Integer allocation;

    @Column(name = "note", length = 500)
    private String note;
}
