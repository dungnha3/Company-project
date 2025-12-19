package DoAn.BE.project.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;
import lombok.*;

import DoAn.BE.user.entity.User;

// Entity quản lý Sprint (Scrum sprint cycles)
@Entity
@Table(name = "sprints")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Sprint {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "sprint_id")
    private Long sprintId;

    @ManyToOne
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(nullable = false, length = 255, columnDefinition = "NVARCHAR(255)")
    private String name;

    @Column(columnDefinition = "NVARCHAR(MAX)")
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

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Relationships
    @OneToMany(mappedBy = "sprint", cascade = CascadeType.ALL)
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
        PLANNING,   // Đang lên kế hoạch
        ACTIVE,     // Đang hoạt động
        COMPLETED,  // Hoàn thành
        CANCELLED   // Đã hủy
    }
}
