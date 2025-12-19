package DoAn.BE.project.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.*;

import DoAn.BE.user.entity.User;

// Entity quản lý công việc/task trong dự án (Issue/Task)
@Entity
@Table(name = "issues")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Issue {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "issue_id")
    private Long issueId;

    @ManyToOne
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne
    @JoinColumn(name = "sprint_id")
    private Sprint sprint;

    @Column(name = "issue_key", nullable = false, unique = true, length = 20, columnDefinition = "NVARCHAR(20)")
    private String issueKey;  // VD: PROJ-001, PROJ-002

    @Column(nullable = false, length = 255, columnDefinition = "NVARCHAR(255)")
    private String title;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String description;


    @ManyToOne
    @JoinColumn(name = "status_id", nullable = false)
    private IssueStatus issueStatus;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private Priority priority = Priority.MEDIUM;

    @ManyToOne
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;  // Người tạo issue

    @ManyToOne
    @JoinColumn(name = "assignee_id")
    private User assignee;  // Người được giao việc

    @Column(name = "estimated_hours", precision = 5, scale = 2)
    private BigDecimal estimatedHours;

    @Column(name = "actual_hours", precision = 5, scale = 2)
    private BigDecimal actualHours;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;


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
    public boolean isOverdue() {
        return this.dueDate != null && 
               LocalDate.now().isAfter(this.dueDate) &&
               !isDone();
    }

    public boolean isDone() {
        return this.issueStatus != null && 
               this.issueStatus.getName() != null &&
               "Done".equals(this.issueStatus.getName());
    }

    public boolean isAssigned() {
        return this.assignee != null;
    }

    public void assignTo(User user) {
        this.assignee = user;
        this.updatedAt = LocalDateTime.now();
    }

    public void changeStatus(IssueStatus newStatus) {
        this.issueStatus = newStatus;
        this.updatedAt = LocalDateTime.now();
    }

    // Enum
    public enum Priority {
        LOW,       // Thấp
        MEDIUM,    // Trung bình
        HIGH,      // Cao
        CRITICAL   // Khẩn cấp
    }
}

