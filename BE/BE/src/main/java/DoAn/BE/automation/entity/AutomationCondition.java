package DoAn.BE.automation.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Entity lưu trữ điều kiện cho automation rule
 * Ví dụ: status = "In Progress" AND priority = "HIGH"
 */
@Entity
@Table(name = "automation_conditions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AutomationCondition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "condition_id")
    private Long conditionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rule_id", nullable = false)
    private AutomationRule rule;

    @Column(nullable = false, length = 100)
    private String field; // status, priority, assignee, labels, etc.

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Operator operator;

    @Column(nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String value; // Giá trị so sánh (có thể là JSON array cho IN operator)

    @Column(name = "order_index")
    @Builder.Default
    private Integer orderIndex = 0;

    public enum Operator {
        EQUALS, // field = value
        NOT_EQUALS, // field != value
        CONTAINS, // field contains value (cho text)
        NOT_CONTAINS, // field not contains value
        IN, // field in [value1, value2, ...]
        NOT_IN, // field not in [...]
        GREATER_THAN, // field > value (cho số)
        LESS_THAN, // field < value
        IS_EMPTY, // field is null/empty
        IS_NOT_EMPTY // field is not null/empty
    }
}
