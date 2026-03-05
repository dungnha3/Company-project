package DoAn.BE.hrm.entity;

import DoAn.BE.common.entity.TenantScopedEntity;
import DoAn.BE.user.entity.User;
import org.hibernate.annotations.Filter;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "okrs", indexes = {
        @Index(name = "idx_okr_owner", columnList = "owner_id"),
        @Index(name = "idx_okr_period", columnList = "period"),
        @Index(name = "idx_okr_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = false)
@ToString(exclude = { "owner", "keyResults" })
@Filter(name = "tenantFilter", condition = "company_id = :companyId")
public class OKR extends TenantScopedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "okr_id")
    @EqualsAndHashCode.Include
    private Long id;

    @Column(name = "title", nullable = false, length = 255, columnDefinition = "NVARCHAR(255)")
    private String title;

    @Column(name = "description", columnDefinition = "NVARCHAR(MAX)")
    private String description;

    @Column(name = "period", nullable = false, length = 20)
    private String period; // Q1-2024, Q2-2024, 2024

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 30)
    private OKRStatus status = OKRStatus.IN_PROGRESS;

    @Column(name = "progress")
    private Integer progress = 0; // 0-100

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    @JsonIgnoreProperties({ "memberships", "personalWorkspaces", "passwordHash", "hibernateLazyInitializer",
            "handler" })
    private User owner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    @JsonIgnore
    private Department department;

    @OneToMany(mappedBy = "okr", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonIgnoreProperties({ "okr", "hibernateLazyInitializer", "handler" })
    private List<KeyResult> keyResults = new ArrayList<>();

    public enum OKRStatus {
        ON_TRACK,
        IN_PROGRESS,
        AT_RISK,
        BEHIND,
        COMPLETED
    }

    public void addKeyResult(KeyResult kr) {
        keyResults.add(kr);
        kr.setOkr(this);
    }

    // Calculate progress from key results
    public void calculateProgress() {
        if (keyResults == null || keyResults.isEmpty()) {
            this.progress = 0;
            return;
        }
        int total = 0;
        for (KeyResult kr : keyResults) {
            if (kr.getTarget() > 0) {
                total += Math.min(100, (int) ((kr.getCurrent() * 100.0) / kr.getTarget()));
            }
        }
        this.progress = total / keyResults.size();
    }
}
