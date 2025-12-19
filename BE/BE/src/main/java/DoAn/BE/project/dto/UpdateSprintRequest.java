package DoAn.BE.project.dto;

import DoAn.BE.project.entity.Sprint;
import java.time.LocalDate;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// Request DTO cập nhật thông tin Sprint
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateSprintRequest {
    @Size(max = 255, message = "Tên sprint không được quá 255 ký tự")
    private String name;
    
    @Size(max = 1000, message = "Mục tiêu không được quá 1000 ký tự")
    private String goal;
    
    private LocalDate startDate;
    private LocalDate endDate;
    private Sprint.SprintStatus status;
}
