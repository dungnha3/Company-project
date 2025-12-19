package DoAn.BE.project.dto;

import java.time.LocalDate;

import DoAn.BE.project.entity.Project.ProjectStatus;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// Request DTO cập nhật thông tin dự án
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProjectRequest {
    @Size(max = 255, message = "Tên dự án không được quá 255 ký tự")
    private String name;
    
    @Size(max = 1000, message = "Mô tả không được quá 1000 ký tự")
    private String description;
    
    private ProjectStatus status;
    private LocalDate startDate;
    private LocalDate endDate;
    private Long phongbanId;
}
