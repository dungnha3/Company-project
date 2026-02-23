package DoAn.BE.user.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.*;

/**
 * PersonalTask - Task cá nhân thuộc về Personal Workspace
 * 
 * FREE tier: Tối đa 10 tasks
 * PRO tier: Unlimited + Labels + Recurring + Reminders
 */
@Entity
@Table(name = "personal_tasks", indexes = {
        @Index(name = "idx_pt_workspace", columnList = "workspace_id"),
        @Index(name = "idx_pt_status", columnList = "workspace_id, status"),
        @Index(name = "idx_pt_due", columnList = "workspace_id, due_date")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PersonalTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "task_id")
    private Long taskId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id", nullable = false)
    private PersonalWorkspace workspace;

    @Column(name = "title", nullable = false, length = 255, columnDefinition = "NVARCHAR(255)")
    private String title;

    @Column(name = "description", columnDefinition = "NVARCHAR(MAX)")
    private String description;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private TaskStatus status = TaskStatus.TODO;

    @Column(name = "priority", nullable = false, length = 10)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private TaskPriority priority = TaskPriority.MEDIUM;

    // ===== PRO Features =====

    /** Labels/Tags - PRO only (comma-separated) */
    @Column(name = "labels", length = 500, columnDefinition = "NVARCHAR(500)")
    private String labels;

    /** Recurring pattern - PRO only (DAILY, WEEKLY, MONTHLY, null=one-time) */
    @Column(name = "recurring_pattern", length = 20)
    @Enumerated(EnumType.STRING)
    private RecurringPattern recurringPattern;

    /** Reminder datetime - PRO only */
    @Column(name = "reminder_at")
    private LocalDateTime reminderAt;

    /** Reminder sent flag */
    @Builder.Default
    @Column(name = "reminder_sent", nullable = false)
    private Boolean reminderSent = false;

    // ===== Timestamps =====

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    // ===== Enums =====

    public enum TaskStatus {
        TODO,
        IN_PROGRESS,
        DONE
    }

    public enum TaskPriority {
        LOW,
        MEDIUM,
        HIGH
    }

    public enum RecurringPattern {
        DAILY,
        WEEKLY,
        MONTHLY
    }

    // ===== Lifecycle =====

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
        if (this.status == TaskStatus.DONE && this.completedAt == null) {
            this.completedAt = LocalDateTime.now();
        }
    }

    @PrePersist
    public void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    // ===== Helpers =====

    public boolean isOverdue() {
        return this.dueDate != null
                && this.dueDate.isBefore(LocalDate.now())
                && this.status != TaskStatus.DONE;
    }

    public boolean isPro() {
        return this.labels != null || this.recurringPattern != null || this.reminderAt != null;
    }
}
