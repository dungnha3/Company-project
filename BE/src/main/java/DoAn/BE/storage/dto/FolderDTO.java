package DoAn.BE.storage.dto;

import DoAn.BE.storage.entity.Folder.FolderType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FolderDTO {
    private Long folderId;
    private String name;
    private String fullPath;
    private Long parentFolderId;
    private String parentFolderName;
    private Long ownerId;
    private String ownerName;
    private FolderType folderType;
    private Long projectId;
    private String projectName;
    private LocalDateTime createdAt;
    private Integer fileCount;
    private Integer subFolderCount;
}
