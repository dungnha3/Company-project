package DoAn.BE.project.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.*;

import DoAn.BE.user.entity.User;

// Entity lưu lịch sử thay đổi của Issue (activity log/audit trail)
@Entity
@Table(name = "issue_activities")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class IssueActivity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "activity_id")
    private Long activityId;

    @ManyToOne
    @JoinColumn(name = "issue_id", nullable = false)
    private Issue issue;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "activity_type", nullable = false, length = 50)
    private ActivityType activityType;

    @Column(name = "field_name", length = 100, columnDefinition = "NVARCHAR(100)")
    private String fieldName;

    @Column(name = "old_value", columnDefinition = "NVARCHAR(MAX)")
    private String oldValue;

    @Column(name = "new_value", columnDefinition = "NVARCHAR(MAX)")
    private String newValue;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String description;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    // Constructor for field changes
    public IssueActivity(Issue issue, User user, ActivityType activityType, 
                        String fieldName, String oldValue, String newValue) {
        this.issue = issue;
        this.user = user;
        this.activityType = activityType;
        this.fieldName = fieldName;
        this.oldValue = oldValue;
        this.newValue = newValue;
        this.description = generateDescription();
    }

    // Constructor for general activities
    public IssueActivity(Issue issue, User user, ActivityType activityType, String description) {
        this.issue = issue;
        this.user = user;
        this.activityType = activityType;
        this.description = description;
    }

    // Helper methods
    private String generateDescription() {
        switch (activityType) {
            case STATUS_CHANGED:
                return String.format("đã thay đổi trạng thái từ '%s' thành '%s'", oldValue, newValue);
            case ASSIGNEE_CHANGED:
                if (oldValue == null) {
                    return String.format("đã giao việc cho %s", newValue);
                } else if (newValue == null) {
                    return String.format("đã hủy giao việc cho %s", oldValue);
                } else {
                    return String.format("đã chuyển giao việc từ %s cho %s", oldValue, newValue);
                }
            case PRIORITY_CHANGED:
                return String.format("đã thay đổi độ ưu tiên từ %s thành %s", oldValue, newValue);
            case SPRINT_CHANGED:
                if (oldValue == null) {
                    return String.format("đã thêm vào sprint '%s'", newValue);
                } else if (newValue == null) {
                    return String.format("đã xóa khỏi sprint '%s'", oldValue);
                } else {
                    return String.format("đã chuyển từ sprint '%s' sang '%s'", oldValue, newValue);
                }
            case DUE_DATE_CHANGED:
                return String.format("đã thay đổi hạn hoàn thành từ %s thành %s", oldValue, newValue);
            case ESTIMATED_HOURS_CHANGED:
                return String.format("đã thay đổi thời gian ước tính từ %s giờ thành %s giờ", oldValue, newValue);
            case ACTUAL_HOURS_CHANGED:
                return String.format("đã cập nhật thời gian thực tế: %s giờ", newValue);
            default:
                return description != null ? description : "đã thực hiện thay đổi";
        }
    }

    public boolean canBeDeletedBy(User user, boolean isProjectManager) {
        // Chỉ Project Manager mới có thể xóa activity log
        return isProjectManager;
    }

    // Enum
    public enum ActivityType {
        CREATED,                // Issue được tạo
        STATUS_CHANGED,         // Thay đổi trạng thái
        ASSIGNEE_CHANGED,       // Thay đổi người được giao
        PRIORITY_CHANGED,       // Thay đổi độ ưu tiên
        SPRINT_CHANGED,         // Thay đổi sprint
        DUE_DATE_CHANGED,       // Thay đổi hạn hoàn thành
        ESTIMATED_HOURS_CHANGED, // Thay đổi thời gian ước tính
        ACTUAL_HOURS_CHANGED,   // Cập nhật thời gian thực tế
        TITLE_CHANGED,          // Thay đổi tiêu đề
        DESCRIPTION_CHANGED,    // Thay đổi mô tả
        COMMENT_ADDED,          // Thêm comment
        COMMENT_EDITED,         // Sửa comment
        COMMENT_DELETED         // Xóa comment
    }
}
