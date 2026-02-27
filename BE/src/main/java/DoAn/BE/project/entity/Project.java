package DoAn.BE.project.entity;

import java.time.LocalDate;

import DoAn.BE.common.entity.TenantScopedEntity;
import org.hibernate.annotations.Filter;
import jakarta.persistence.*;
import lombok.*;

import DoAn.BE.user.entity.User;
import DoAn.BE.hrm.entity.Department;
@Entity
@Table(name = "projects", indexes = {
        // Index cho query: findByStatus (Active project list)
        @jakarta.persistence.Index(name = "idx_proj_status", columnList = "status"),
        // Index cho query: findByCreatedBy (User's created projects)
        @jakarta.persistence.Index(name = "idx_proj_createdby", columnList = "created_by"),
        // Index cho query: findByPhongBan (Department's projects)
        @jakarta.persistence.Index(name = "idx_proj_department", columnList = "department_id"),
        // Index cho query: findByIsActive (Active filter)
        @jakarta.persistence.Index(name = "idx_proj_active", columnList = "is_active")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Filter(name = "tenantFilter", condition = "company_id = :companyId")
public class Project extends TenantScopedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "project_id")
    private Long projectId;

    @Column(nullable = false, length = 255, columnDefinition = "NVARCHAR(255)")
    private String name;

    @Column(name = "key_project", nullable = false, unique = true, length = 10, columnDefinition = "NVARCHAR(10)")
    private String keyProject; // VD: PROJ-001, HRM-001

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(length = 50, nullable = false)
    private ProjectStatus status = ProjectStatus.ACTIVE;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "budget", precision = 15, scale = 2)
    private java.math.BigDecimal budget;

    @ManyToOne
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @ManyToOne
    @JoinColumn(name = "department_id")
    private Department department;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    public boolean isActive() {
        return this.isActive && this.status == ProjectStatus.ACTIVE;
    }

    public boolean isCompleted() {
        return this.status == ProjectStatus.COMPLETED;
    }

    public boolean isOverdue() {
        return this.status == ProjectStatus.ACTIVE &&
                this.endDate != null &&
                this.endDate.isBefore(LocalDate.now());
    }

    // Enum
    public enum ProjectStatus {
        ACTIVE, // Đang hoạt động
        ON_HOLD, // Tạm dừng
        OVERDUE, // Quá hạn
        COMPLETED, // Hoàn thành
        CANCELLED // Đã hủy
    }
}
