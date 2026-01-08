package DoAn.BE.project.dto;

import java.time.LocalDate;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GanttChartDTO {

    private Long projectId;
    private String projectName;
    private LocalDate startDate;
    private LocalDate endDate;
    private List<GanttPhaseDTO> phases;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class GanttPhaseDTO {
        private Long id;
        private String name;
        private LocalDate startDate;
        private LocalDate endDate;
        private String status;
        private Integer progress; // 0-100 (Automated)
        private List<GanttTaskDTO> tasks;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class GanttTaskDTO {
        private Long id;
        private String key; // PROJ-123
        private String name; // Issue subject
        private LocalDate startDate;
        private LocalDate dueDate;
        private String status; // Todo, Done...
        private String assigneeName;
        private String assigneeAvatar;
    }
}
