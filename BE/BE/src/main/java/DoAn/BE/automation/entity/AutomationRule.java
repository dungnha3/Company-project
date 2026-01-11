package DoAn.BE.automation.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.*;
import lombok.*;

import DoAn.BE.company.entity.Company;
import DoAn.BE.project.entity.Project;
import DoAn.BE.user.entity.User;

/**
 * Entity lưu trữ automation rules
 * Mỗi rule có trigger, conditions và actions
 */
@Entity
@Table(name = "automation_rules", indexes = {
        @Index(name = "idx_rule_project", columnList = "project_id"),
        @Index(name = "idx_rule_company", columnList = "company_id"),
        @Index(name = "idx_rule_trigger", columnList = "trigger_type")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AutomationRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "rule_id")
    private Long ruleId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(nullable = false, length = 255, columnDefinition = "NVARCHAR(255)")
    private String name;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "trigger_type", nullable = false, length = 30)
    private TriggerType triggerType;

    @Column(name = "trigger_config", columnDefinition = "NVARCHAR(MAX)")
    private String triggerConfig; // JSON config cho trigger

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @OneToMany(mappedBy = "rule", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<AutomationCondition> conditions = new ArrayList<>();

    @OneToMany(mappedBy = "rule", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<AutomationAction> actions = new ArrayList<>();

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum TriggerType {
        ISSUE_CREATED, // Khi issue được tạo
        ISSUE_UPDATED, // Khi issue được cập nhật
        STATUS_CHANGED, // Khi status thay đổi
        ASSIGNEE_CHANGED, // Khi người được giao thay đổi
        PRIORITY_CHANGED, // Khi priority thay đổi
        COMMENT_ADDED, // Khi có comment mới
        DUE_DATE_APPROACHING, // Khi gần deadline
        SPRINT_STARTED, // Khi sprint bắt đầu
        SPRINT_COMPLETED // Khi sprint hoàn thành
    }
}
