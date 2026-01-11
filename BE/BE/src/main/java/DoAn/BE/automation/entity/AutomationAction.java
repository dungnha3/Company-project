package DoAn.BE.automation.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Entity lưu trữ actions cho automation rule
 * Ví dụ: UPDATE_FIELD status = "Done", SEND_NOTIFICATION to assignee
 */
@Entity
@Table(name = "automation_actions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AutomationAction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "action_id")
    private Long actionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rule_id", nullable = false)
    private AutomationRule rule;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false, length = 30)
    private ActionType actionType;

    @Column(name = "action_config", columnDefinition = "NVARCHAR(MAX)")
    private String actionConfig; // JSON config cho action

    @Column(name = "order_index")
    @Builder.Default
    private Integer orderIndex = 0;

    public enum ActionType {
        UPDATE_FIELD, // Cập nhật field (status, priority, assignee...)
        SEND_NOTIFICATION, // Gửi thông báo
        ADD_COMMENT, // Thêm comment tự động
        ADD_LABEL, // Thêm label
        REMOVE_LABEL, // Xóa label
        ASSIGN_TO, // Gán cho user
        MOVE_TO_SPRINT, // Chuyển sang sprint khác
        SEND_WEBHOOK, // Gọi webhook external
        SEND_EMAIL // Gửi email
    }
}
