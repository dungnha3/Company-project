package DoAn.BE.hrm.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "key_results")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@Builder
public class KeyResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "key_result_id")
    @EqualsAndHashCode.Include
    private Long id;

    @Column(name = "title", nullable = false, length = 255, columnDefinition = "NVARCHAR(255)")
    private String title;

    @Builder.Default
    @Column(name = "target", nullable = false)
    private Double target = 0.0;

    @Builder.Default
    @Column(name = "current_value")
    private Double current = 0.0;

    @Column(name = "unit", length = 50, columnDefinition = "NVARCHAR(50)")
    private String unit; // %, số, đơn vị khác

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "okr_id", nullable = false)
    @JsonIgnore
    private OKR okr;

    public int getProgressPercent() {
        if (target == null || target == 0)
            return 0;
        return Math.min(100, (int) ((current * 100.0) / target));
    }
}
