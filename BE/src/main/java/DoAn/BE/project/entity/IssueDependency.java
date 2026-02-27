package DoAn.BE.project.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

// Entity representing dependencies between issues for Gantt chart
// Supports 4 dependency types: FS (Finish-to-Start), SS, FF, SF
// /
@Entity
@Table(name = "issue_dependencies", indexes = {
        @Index(name = "idx_dep_predecessor", columnList = "predecessor_id"),
        @Index(name = "idx_dep_successor", columnList = "successor_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_dependency", columnNames = { "predecessor_id", "successor_id" })
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IssueDependency {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "dependency_id")
    private Long dependencyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "predecessor_id", nullable = false)
    private Issue predecessor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "successor_id", nullable = false)
    private Issue successor;

    @Enumerated(EnumType.STRING)
    @Column(name = "dependency_type", nullable = false, length = 20)
    @Builder.Default
    private DependencyType dependencyType = DependencyType.FINISH_TO_START;

    // Lag time in days (can be negative for lead time)
    // /
    @Column(name = "lag_days")
    @Builder.Default
    private Integer lagDays = 0;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    // Dependency types for Gantt chart
    // /
    public enum DependencyType {
        FINISH_TO_START, // FS: Successor starts when predecessor finishes
        START_TO_START, // SS: Both start at same time
        FINISH_TO_FINISH, // FF: Both finish at same time
        START_TO_FINISH // SF: Predecessor starts when successor finishes (rare)
    }

    // Check if this dependency creates a circular reference
    // /
    public boolean wouldCreateCycle(Issue targetPredecessor) {
        // Simple check - more thorough check should be done at service level
        return predecessor.getIssueId().equals(targetPredecessor.getIssueId());
    }
}
