package DoAn.BE.storage.dto;

import DoAn.BE.storage.entity.Folder.FolderType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateFolderRequest {
    @NotBlank(message = "Tên thư mục không được để trống")
    @Size(max = 255, message = "Tên thư mục không được quá 255 ký tự")
    private String name;
    
    private Long parentFolderId;
    private FolderType folderType;
    private Long projectId;
}
