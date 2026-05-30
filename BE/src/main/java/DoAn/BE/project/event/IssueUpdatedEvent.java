package DoAn.BE.project.event;

import DoAn.BE.project.entity.Issue;
import DoAn.BE.user.entity.User;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * Event được publish sau khi một Issue bị thay đổi (trạng thái, comment...).
 *
 * <p>Tách riêng khỏi {@link IssueEvent} (vốn dùng cho ASSIGNED) để:
 * <ul>
 *   <li>Tránh làm phức tạp handler đang có</li>
 *   <li>Mang thêm context phong phú: changeType, changeDetail, actor entity</li>
 * </ul>
 *
 * <p><b>Luồng sử dụng:</b>
 * <pre>
 *   IssueService.changeIssueStatus()  ──publish──►  IssueNotificationListener
 *   IssueService.addComment()         ──publish──►  IssueNotificationListener
 * </pre>
 */
@Getter
public class IssueUpdatedEvent extends ApplicationEvent {

    /** Snapshot của Issue sau khi đã lưu vào DB (chứa assignee, reporter, project...) */
    private final Issue issue;

    /**
     * Loại thay đổi để hiển thị trong email.
     * Ví dụ: "Cập nhật trạng thái", "Bình luận mới", "Thay đổi mức ưu tiên"
     */
    private final String changeType;

    /**
     * Mô tả chi tiết thay đổi, có thể null.
     * Ví dụ: "To Do → In Progress", nội dung comment 50 ký tự đầu...
     */
    private final String changeDetail;

    /**
     * User thực hiện hành động — dùng để loại ra khỏi danh sách nhận email.
     * KHÔNG BAO GIỜ để null; nếu không xác định được actor thì không publish event.
     */
    private final User actor;

    /**
     * @param source       Bean publish event (thường là IssueService)
     * @param issue        Issue đã được lưu thành công vào DB
     * @param changeType   Loại thay đổi (hiển thị trong subject email)
     * @param changeDetail Chi tiết thay đổi, có thể null nếu không cần
     * @param actor        User thực hiện thao tác (sẽ bị loại ra khỏi danh sách nhận email)
     */
    public IssueUpdatedEvent(Object source, Issue issue, String changeType, String changeDetail, User actor) {
        super(source);
        this.issue = issue;
        this.changeType = changeType;
        this.changeDetail = changeDetail;
        this.actor = actor;
    }
}
