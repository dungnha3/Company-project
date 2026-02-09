package DoAn.BE.project.dto;

import DoAn.BE.project.entity.IssueActivity.ActivityType;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

// DTO truyền dữ liệu lịch sử Issue
@Data
@NoArgsConstructor
@AllArgsConstructor
public class IssueActivityDTO {
    private Long activityId;
    private Long issueId;
    private String issueTitle;
    private Long userId;
    private String userName;
    private String userAvatarUrl;
    private ActivityType activityType;
    private String fieldName;
    private String oldValue;
    private String newValue;
    private String description;
    private LocalDateTime createdAt;
    private Boolean canDelete;
}
