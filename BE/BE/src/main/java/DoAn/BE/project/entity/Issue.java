package DoAn.BE.project.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.*;

import DoAn.BE.user.entity.User;

// [Entity công việc/task trong dự án] (Role: Data Model)
@Entity
@Table(name = "issues", indexes = {
        // Index cho query: findByProject (Project's issues)
        @jakarta.persistence.Index(name = "idx_issue_project", columnList = "project_id"),
        // Index cho query: findBySprint (Sprint's issues)
        @jakarta.persistence.Index(name = "idx_issue_sprint", columnList = "sprint_id"),
        // Index cho query: findByAssignee (User's assigned issues)
        @jakarta.persistence.Index(name = "idx_issue_assignee", columnList = "assignee_id"),
        // Index cho query: findByIssueStatus (Status filter)
        @jakarta.persistence.Index(name = "idx_issue_status", columnList = "status_id"),
        // Index cho query: findByPriority (Priority filter)
        @jakarta.persistence.Index(name = "idx_issue_priority", columnList = "priority")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class Issue extends DoAn.BE.common.entity.BaseEntity {

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

    @ManyToOne
    @JoinColumn(name = "phase_id")
    private ProjectPhase phase; // Giai đoạn (Waterfall)

    @Column(name = "issue_key", nullable = false, unique = true, length = 20, columnDefinition = "NVARCHAR(20)")
    private String issueKey; // VD: PROJ-001, PROJ-002

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
    private User reporter; // Người tạo issue

    @ManyToOne
    @JoinColumn(name = "assignee_id")
    private User assignee; // Người được giao việc

    @Column(name = "estimated_hours", precision = 5, scale = 2)
    private BigDecimal estimatedHours;

    @Column(name = "actual_hours", precision = 5, scale = 2)
    private BigDecimal actualHours;

    @Column(name = "due_date")
    private LocalDate dueDate;

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
        this.setUpdatedAt(LocalDateTime.now());
    }

    public void changeStatus(IssueStatus newStatus) {
        this.issueStatus = newStatus;
        this.setUpdatedAt(LocalDateTime.now());
    }

    // Enum
    public enum Priority {
        LOW, // Thấp
        MEDIUM, // Trung bình
        HIGH, // Cao
        CRITICAL // Khẩn cấp
    }
}
