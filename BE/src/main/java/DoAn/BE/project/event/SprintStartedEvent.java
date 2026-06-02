package DoAn.BE.project.event;

import DoAn.BE.project.entity.Sprint;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.util.List;
import java.util.Map;

/**
 * Event được publish sau khi một Sprint chuyển sang trạng thái ACTIVE.
 *
 * <p>Chứa danh sách các Assignees cùng issue keys của họ trong sprint đó,
 * cho phép listener gửi email tổng hợp (1 email/user) thay vì nhiều email lẻ.
 *
 * <p><b>Luồng sử dụng:</b>
 * <pre>
 *   SprintService.startSprint()  ──publish──►  SprintStartedNotificationListener
 *                                                            │
 *                                              ┌──────────────┴──────────────┐
 *                                              │  Group issues by assignee   │
 *                                              │  sendSprintStartedBatchEmail │
 *                                              │  (1 email per user)         │
 *                                              └─────────────────────────────┘
 * </pre>
 */
@Getter
public class SprintStartedEvent extends ApplicationEvent {

    /** Sprint entity đầy đủ (sau khi đã lưu với status = ACTIVE) */
    private final Sprint sprint;

    /**
     * Bản đồ assignee → danh sách issue keys được giao cho họ trong sprint này.
     * Được tính toán trước bởi SprintService để tránh phải query lại trong listener.
     */
    private final Map<Long, List<String>> assigneeIssueKeys;

    /** ID của user thực hiện hành động bắt đầu sprint */
    private final Long actorId;

    public SprintStartedEvent(Object source, Sprint sprint, Map<Long, List<String>> assigneeIssueKeys, Long actorId) {
        super(source);
        this.sprint = sprint;
        this.assigneeIssueKeys = assigneeIssueKeys;
        this.actorId = actorId;
    }
}
