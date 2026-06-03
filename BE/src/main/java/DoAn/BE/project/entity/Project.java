package DoAn.BE.project.entity;

import java.time.LocalDate;

import DoAn.BE.common.entity.TenantScopedEntity;
import org.hibernate.annotations.Filter;
import jakarta.persistence.*;
import lombok.*;

import DoAn.BE.user.entity.User;


@Entity
@Table(name = "projects", indexes = {
        // Index cho query: findByStatus (Active project list)
        @jakarta.persistence.Index(name = "idx_proj_status", columnList = "status"),
        // Index cho query: findByCreatedBy (User's created projects)
        @jakarta.persistence.Index(name = "idx_proj_createdby", columnList = "created_by"),

        // Index cho query: findByIsActive (Active filter)
        @jakarta.persistence.Index(name = "idx_proj_active", columnList = "is_active")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = false)
@Filter(name = "tenantFilter", condition = "company_id = :companyId")
public class Project extends TenantScopedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "project_id")
    @EqualsAndHashCode.Include
    private Long projectId;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(name = "key_project", nullable = false, unique = true, length = 10)
    private String keyProject; // VD: PROJ-001, HRM-001

    @Column(columnDefinition = "TEXT")
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

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    // Google Drive folder ID for this project (under SaaS_Storage/{projectName}/)
    @Column(name = "drive_folder_id")
    private String driveFolderId;

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
