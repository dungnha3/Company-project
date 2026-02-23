package DoAn.BE.project.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// Request DTO tạo dự án mới
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateProjectRequest {
    @NotBlank(message = "Tên dự án không được để trống")
    @Size(max = 255, message = "Tên dự án không được quá 255 ký tự")
    private String name;
    
    @NotBlank(message = "Mã dự án không được để trống")
    @Size(max = 10, message = "Mã dự án không được quá 10 ký tự")
    private String keyProject;
    
    @Size(max = 1000, message = "Mô tả không được quá 1000 ký tự")
    private String description;
    
    private LocalDate startDate;
    private LocalDate endDate;
    private Long phongbanId;
}
