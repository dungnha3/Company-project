package DoAn.BE.hrm.entity;

import DoAn.BE.common.entity.TenantScopedEntity;
import org.hibernate.annotations.Filter;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(name = "onboarding_instances", indexes = {
        @Index(name = "idx_onb_employee", columnList = "employee_id"),
        @Index(name = "idx_onb_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = false)
@Filter(name = "tenantFilter", condition = "company_id = :companyId")
public class OnboardingInstance extends TenantScopedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "instance_id")
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    private OnboardingTemplate template;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "current_step")
    private Integer currentStep = 1;

    @Column(name = "progress")
    private Integer progress = 0; // 0-100

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 30)
    private OnboardingStatus status = OnboardingStatus.IN_PROGRESS;

    public enum OnboardingStatus {
        IN_PROGRESS,
        COMPLETED,
        CANCELLED
    }

    public void updateProgress() {
        if (template == null || template.getSteps() == null || template.getSteps().isEmpty()) {
            this.progress = 0;
            return;
        }
        int totalSteps = template.getSteps().size();
        this.progress = Math.min(100, ((currentStep - 1) * 100) / totalSteps);
    }
}
