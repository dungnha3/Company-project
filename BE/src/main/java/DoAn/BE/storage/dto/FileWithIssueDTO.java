package DoAn.BE.storage.dto;

import DoAn.BE.storage.entity.FileEntity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileWithIssueDTO {
    private Long id;
    private String fileName;
    private String googleDriveFileId;
    private Long fileSize;
    private String contentType;
    private Long projectId;
    private Long issueId;
    private Long uploadedById;
    private String uploadedByName;
    private String folder;
    private LocalDateTime createdAt;

    // Issue-linked metadata (null nếu file không gắn với issue)
    private String issueKey;
    private String issueTitle;
    private String issueStatus;
    private String issueAssigneeName;

    public static FileWithIssueDTO fromEntity(FileEntity f) {
        FileWithIssueDTOBuilder b = FileWithIssueDTO.builder()
                .id(f.getId())
                .fileName(f.getFileName())
                .googleDriveFileId(f.getGoogleDriveFileId())
                .fileSize(f.getFileSize())
                .contentType(f.getContentType())
                .projectId(f.getProjectId())
                .issueId(f.getIssueId())
                .uploadedById(f.getUploadedBy() != null ? f.getUploadedBy().getUserId() : null)
                .uploadedByName(f.getUploadedBy() != null
                        ? (f.getUploadedBy().getFullName() != null
                            ? f.getUploadedBy().getFullName()
                            : f.getUploadedBy().getUsername())
                        : null)
                .folder(f.getFolder())
                .createdAt(f.getCreatedAt());

        if (f.getIssue() != null) {
            DoAn.BE.project.entity.Issue issue = f.getIssue();
            b.issueTitle(issue.getTitle());
            b.issueKey(issue.getIssueKey());
            if (issue.getIssueStatus() != null) {
                b.issueStatus(issue.getIssueStatus().getName());
            }
            if (issue.getAssignee() != null) {
                DoAn.BE.user.entity.User a = issue.getAssignee();
                b.issueAssigneeName(a.getFullName() != null ? a.getFullName() : a.getUsername());
            }
        }
        return b.build();
    }
}
