package DoAn.BE.project.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

// DTO truyền dữ liệu comment Issue
@Data
@NoArgsConstructor
@AllArgsConstructor
public class IssueCommentDTO {
    private Long commentId;
    private Long issueId;
    private String issueTitle;
    private Long authorId;
    private String authorName;
    private String authorAvatarUrl;
    private String content;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean isEdited;
    private Boolean canEdit;
    private Boolean canDelete;
}
