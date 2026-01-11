package DoAn.BE.automation.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.*;

import DoAn.BE.project.entity.Issue;

/**
 * Entity lưu trữ log thực thi automation
 * Để debug và audit
 */
@Entity
@Table(name = "automation_logs", indexes = {
        @Index(name = "idx_log_rule", columnList = "rule_id"),
        @Index(name = "idx_log_issue", columnList = "issue_id"),
        @Index(name = "idx_log_executed", columnList = "executed_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AutomationLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id")
    private Long logId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rule_id")
    private AutomationRule rule;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "issue_id")
    private Issue issue;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ExecutionStatus status;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String message;

    @Column(name = "actions_executed")
    private Integer actionsExecuted;

    @Column(name = "executed_at", nullable = false)
    private LocalDateTime executedAt;

    @PrePersist
    protected void onCreate() {
        executedAt = LocalDateTime.now();
    }

    public enum ExecutionStatus {
        SUCCESS, // Thực thi thành công
        FAILED, // Thực thi thất bại
        PARTIAL, // Một số actions thất bại
        SKIPPED // Bỏ qua do conditions không match
    }
}
