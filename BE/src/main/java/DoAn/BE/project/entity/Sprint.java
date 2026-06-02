package DoAn.BE.project.entity;

import java.time.LocalDate;

import jakarta.persistence.*;
import lombok.*;

import DoAn.BE.user.entity.User;

@Entity
@Table(name = "sprints")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = false)
public class Sprint extends DoAn.BE.common.entity.BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "sprint_id")
    @EqualsAndHashCode.Include
    private Long sprintId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "phase_id")
    private ProjectPhase phase;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String goal;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private SprintStatus status = SprintStatus.PLANNING;

    @ManyToOne
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    public boolean isActive() {
        return this.status == SprintStatus.ACTIVE;
    }

    public boolean isCompleted() {
        return this.status == SprintStatus.COMPLETED;
    }

    public boolean canBeStarted() {
        return this.status == SprintStatus.PLANNING &&
                this.startDate != null &&
                this.endDate != null;
    }

    public boolean canBeCompleted() {
        return this.status == SprintStatus.ACTIVE;
    }

    public boolean isOverdue() {
        return this.status == SprintStatus.ACTIVE &&
                this.endDate != null &&
                this.endDate.isBefore(LocalDate.now());
    }

    // Enum
    public enum SprintStatus {
        PLANNING, // Đang lên kế hoạch
        ACTIVE, // Đang hoạt động
        COMPLETED, // Hoàn thành
        CANCELLED // Đã hủy
    }
}
