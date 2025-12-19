package DoAn.BE.project.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import DoAn.BE.project.entity.Issue.Priority;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// Request DTO cập nhật thông tin Issue
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateIssueRequest {
    @Size(max = 255, message = "Tiêu đề không được quá 255 ký tự")
    private String title;
    
    @Size(max = 2000, message = "Mô tả không được quá 2000 ký tự")
    private String description;
    
    private Integer statusId;
    private Priority priority;
    private Long assigneeId;
    private BigDecimal estimatedHours;
    private BigDecimal actualHours;
    private LocalDate dueDate;
}
