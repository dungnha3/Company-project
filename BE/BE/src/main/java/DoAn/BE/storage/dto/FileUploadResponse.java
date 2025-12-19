package DoAn.BE.storage.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FileUploadResponse {
    private Long fileId;
    private String filename;
    private String originalFilename;
    private Long fileSize;
    private String fileSizeFormatted;
    private String mimeType;
    private String downloadUrl;
    private String message;
}
