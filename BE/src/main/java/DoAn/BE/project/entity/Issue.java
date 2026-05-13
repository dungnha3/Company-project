package DoAn.BE.project.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.*;
import lombok.*;

import DoAn.BE.user.entity.User;

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
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = false)
public class Issue extends DoAn.BE.common.entity.BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "issue_id")
    @EqualsAndHashCode.Include
    private Long issueId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sprint_id")
    private Sprint sprint;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "phase_id")
    private ProjectPhase phase; // Giai đoạn (Waterfall)

    @Column(name = "issue_key", nullable = false, unique = true, length = 20, columnDefinition = "NVARCHAR(20)")
    private String issueKey; // VD: PROJ-001, PROJ-002

    @Column(nullable = false, length = 255, columnDefinition = "NVARCHAR(255)")
    private String title;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "status_id", nullable = false)
    private IssueStatus issueStatus;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private Priority priority = Priority.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Column(name = "issue_type", length = 20)
    private IssueType issueType = IssueType.TASK;

    @Column(name = "order_index")
    private Integer orderIndex = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter; // Người tạo issue

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    private User assignee; // Người được giao việc

    @Column(name = "estimated_hours", precision = 5, scale = 2)
    private BigDecimal estimatedHours;

    @Column(name = "actual_hours", precision = 5, scale = 2)
    private BigDecimal actualHours;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "due_date")
    private LocalDate dueDate;

    // Trọng số (1-10) đại diện mức độ khó/dễ
    @Column(name = "weight")
    private Integer weight;

    // Eisenhower Matrix flags
    @Column(name = "is_important")
    private Boolean isImportant = false;

    @Column(name = "is_urgent")
    private Boolean isUrgent = false;

    // Timestamp khi issue được hoàn thành (Done)
    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    // Đếm số lần bị trả lại (từ Review/Done về In Progress)
    @Column(name = "rework_count")
    private Integer reworkCount = 0;

    // Custom field values for this issue
    // /
    @OneToMany(mappedBy = "issue", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<IssueCustomFieldValue> customFieldValues = new ArrayList<>();

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
        // Auto-set completedAt when status changes to Done
        if ("Done".equals(newStatus.getName())) {
            if (this.completedAt == null) {
                this.completedAt = LocalDateTime.now();
            }
        } else {
            this.completedAt = null; // Reset if moved away from Done
        }
    }

    /**
     * Eisenhower quadrant: 1=Làm ngay, 2=Lên kế hoạch, 3=Giao lại, 4=Làm sau
     */
    public int getEisenhowerQuadrant() {
        boolean imp = Boolean.TRUE.equals(this.isImportant);
        boolean urg = Boolean.TRUE.equals(this.isUrgent);
        if (imp && urg)
            return 1;
        if (imp && !urg)
            return 2;
        if (!imp && urg)
            return 3;
        return 4;
    }

    // Enum
    public enum Priority {
        LOW, // Thấp
        MEDIUM, // Trung bình
        HIGH, // Cao
        CRITICAL // Khẩn cấp
    }

    public enum IssueType {
        TASK,
        BUG,
        STORY
    }
}
