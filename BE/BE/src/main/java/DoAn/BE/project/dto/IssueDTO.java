package DoAn.BE.project.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import DoAn.BE.project.entity.Issue.Priority;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// DTO truyền dữ liệu công việc/task
@Data
@NoArgsConstructor
@AllArgsConstructor
public class IssueDTO {
    private Long issueId;
    private Long projectId;
    private String projectName;
    private Long sprintId;
    private String sprintName;
    private String issueKey;
    private String title;
    private String description;
    private Integer statusId;
    private String statusName;
    private String statusColor;
    private Priority priority;
    private Long reporterId;
    private String reporterName;
    private Long assigneeId;
    private String assigneeName;
    private BigDecimal estimatedHours;
    private BigDecimal actualHours;
    private LocalDate dueDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean isOverdue;
}
