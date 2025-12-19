package DoAn.BE.project.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;
import lombok.*;

import DoAn.BE.user.entity.User;
import DoAn.BE.hr.entity.PhongBan;

// Entity quản lý dự án (Agile/Scrum projects)
@Entity
@Table(name = "projects")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Project {

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
    @JoinColumn(name = "phongban_id")
    private PhongBan phongBan;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Relationships
    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<ProjectMember> members;

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<Issue> issues;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Helper methods
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
