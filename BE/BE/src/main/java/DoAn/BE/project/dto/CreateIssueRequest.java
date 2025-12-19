package DoAn.BE.project.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import DoAn.BE.project.entity.Issue.Priority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// Request DTO tạo Issue/task mới
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateIssueRequest {
    @NotNull(message = "Project ID không được để trống")
    private Long projectId;
    
    @NotBlank(message = "Tiêu đề không được để trống")
    @Size(max = 255, message = "Tiêu đề không được quá 255 ký tự")
    private String title;
    
    @Size(max = 2000, message = "Mô tả không được quá 2000 ký tự")
    private String description;
    
    // StatusId có thể null, mặc định là To Do (id: 1)
    private Integer statusId;
    
    private Priority priority;
    private Long assigneeId;
    private BigDecimal estimatedHours;
    private LocalDate dueDate;
}
