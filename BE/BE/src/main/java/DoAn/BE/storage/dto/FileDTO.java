package DoAn.BE.storage.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FileDTO {
    private Long fileId;
    private String filename;
    private String originalFilename;
    private String filePath;
    private Long fileSize;
    private String fileSizeFormatted;
    private String mimeType;
    private String fileExtension;
    private Long folderId;
    private String folderName;
    private Long ownerId;
    private String ownerName;
    private Long projectId;
    private Integer version;
    private Boolean isLatestVersion;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean isImage;
    private Boolean isDocument;
    private Boolean isVideo;
}
