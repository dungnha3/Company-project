package DoAn.BE.smart.dto;

import lombok.*;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SmartAssistantSummaryDTO {
    private SprintHealthDTO sprintHealth;
    private WorkloadAnalysisDTO workload;
    private ProjectRiskDTO projectRisk;
    private int backlogCount;
    private List<DeadlineWarning> deadlineWarnings;
    private List<String> topInsights;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DeadlineWarning {
        private Long issueId;
        private String issueKey;
        private String title;
        private String type; // overdue, near_deadline
    }
}
