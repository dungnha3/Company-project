package DoAn.BE.project.dto;

import DoAn.BE.project.entity.Sprint;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;

// DTO truyền dữ liệu Sprint
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SprintDTO {
    private Long sprintId;
    private Long projectId;
    private String projectName;
    private String name;
    private String goal;
    private LocalDate startDate;
    private LocalDate endDate;
    private Sprint.SprintStatus status;
    private Long createdBy;
    private String createdByName;
    private LocalDateTime createdAt;
    private int totalIssues;
    private int completedIssues;
}
