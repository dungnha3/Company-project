package DoAn.BE.hrm.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "onboarding_steps")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@Builder
public class OnboardingStep {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "step_id")
    @EqualsAndHashCode.Include
    private Long id;

    @Column(name = "title", nullable = false, length = 200, columnDefinition = "NVARCHAR(200)")
    private String title;

    @Column(name = "description", columnDefinition = "NVARCHAR(1000)")
    private String description;

    @Builder.Default
    @Column(name = "order_index")
    private Integer orderIndex = 0;

    @Builder.Default
    @Column(name = "required")
    private Boolean required = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    @JsonIgnore
    private OnboardingTemplate template;
}
