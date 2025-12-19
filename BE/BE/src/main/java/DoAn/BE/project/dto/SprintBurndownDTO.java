package DoAn.BE.project.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDate;
import java.util.List;

// DTO biểu đồ Burndown Chart cho Sprint (tracking progress)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SprintBurndownDTO {
    private Long sprintId;
    private String sprintName;
    private LocalDate startDate;
    private LocalDate endDate;
    private int totalIssues;
    private List<BurndownPoint> burndownData;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BurndownPoint {
        private LocalDate date;
        private int remainingIssues;
        private int idealRemaining;
        private int completedIssues;
    }
}
