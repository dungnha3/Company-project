package DoAn.BE.project.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// Request DTO tạo comment mới cho Issue
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateCommentRequest {
    @NotNull(message = "Issue ID không được để trống")
    private Long issueId;
    
    @NotBlank(message = "Nội dung comment không được để trống")
    @Size(max = 2000, message = "Nội dung comment không được quá 2000 ký tự")
    private String content;
}
