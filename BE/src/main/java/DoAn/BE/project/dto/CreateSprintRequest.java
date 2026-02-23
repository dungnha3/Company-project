package DoAn.BE.project.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// Request DTO tạo Sprint mới
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateSprintRequest {
    @NotNull(message = "ID dự án không được để trống")
    private Long projectId;
    
    @NotBlank(message = "Tên sprint không được để trống")
    @Size(max = 255, message = "Tên sprint không được quá 255 ký tự")
    private String name;
    
    @Size(max = 1000, message = "Mục tiêu không được quá 1000 ký tự")
    private String goal;
    
    private LocalDate startDate;
    private LocalDate endDate;
}
