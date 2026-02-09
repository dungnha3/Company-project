package DoAn.BE.hrm.entity;

import DoAn.BE.common.entity.TenantScopedEntity;
import org.hibernate.annotations.Filter;
import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "onboarding_templates")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@ToString(exclude = { "steps" })
@Filter(name = "tenantFilter", condition = "company_id = :companyId")
public class OnboardingTemplate extends TenantScopedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "template_id")
    private Long id;

    @Column(name = "name", nullable = false, length = 100, columnDefinition = "NVARCHAR(100)")
    private String name;

    @Column(name = "description", columnDefinition = "NVARCHAR(500)")
    private String description;

    @Column(name = "duration_days")
    private Integer duration = 30; // Default 30 days

    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("orderIndex ASC")
    private List<OnboardingStep> steps = new ArrayList<>();

    public void addStep(OnboardingStep step) {
        steps.add(step);
        step.setTemplate(this);
    }
}
