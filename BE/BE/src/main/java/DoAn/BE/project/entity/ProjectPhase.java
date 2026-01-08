package DoAn.BE.project.entity;

import java.time.LocalDate;

import jakarta.persistence.*;
import lombok.*;

import DoAn.BE.user.entity.User;

// [Entity Giai đoạn dự án - Waterfall Model] (Role: Data Model)
@Entity
@Table(name = "project_phases")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class ProjectPhase extends DoAn.BE.common.entity.BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "phase_id")
    private Long phaseId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(nullable = false, length = 255, columnDefinition = "NVARCHAR(255)")
    private String name; // VD: Giai đoạn 1, Giai đoạn Thiết kế

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String description;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private PhaseStatus status = PhaseStatus.PLANNING;

    @Column(name = "order_index")
    private Integer orderIndex; // Thứ tự hiển thị (1, 2, 3...)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    // Helper methods
    public boolean isActive() {
        return this.status == PhaseStatus.IN_PROGRESS;
    }

    public boolean isCompleted() {
        return this.status == PhaseStatus.COMPLETED;
    }

    // Enum
    public enum PhaseStatus {
        PLANNING, // Đang lập kế hoạch
        IN_PROGRESS, // Đang thực hiện
        COMPLETED, // Đã hoàn thành
        ON_HOLD // Tạm dừng
    }
}
