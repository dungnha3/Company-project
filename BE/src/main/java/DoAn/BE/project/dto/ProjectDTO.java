package DoAn.BE.project.dto;

import DoAn.BE.project.entity.Project;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDate;
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectDTO {
    private Long projectId;
    private String name;
    private String keyProject;
    private String description;
    private Project.ProjectStatus status;
    private LocalDate startDate;
    private LocalDate endDate;

    private Long createdBy;
    private String createdByName;
    private Integer progress; // Tiến độ dự án (%)
}
