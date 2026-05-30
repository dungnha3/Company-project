package DoAn.BE.smart.dto;

import java.math.BigDecimal;
import java.util.List;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScoreSuggestionDTO {

    // QuickScore - for issue completion
    private BigDecimal suggestedScore;
    private String confidence; // high, medium, low
    private List<ScoreReason> reasons;

    // FullReview - for period review
    private EmployeeInsights employeeInsights;
    private SuggestedScores suggestedScores;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ScoreReason {
        private String factor;
        private double impact; // can be negative
        private String label;
        private String type; // positive, negative, warning, info
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class EmployeeInsights {
        private int totalTasks;
        private BigDecimal averageScore;
        private BigDecimal previousPeriodScore;
        private BigDecimal trend; // positive = improvement
        private int onTimeRate; // percentage
        private int reworkCount;
        private BigDecimal teamAverage;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SuggestedScores {
        private BigDecimal technicalScore;
        private BigDecimal attitudeScore;
        private BigDecimal softSkillsScore;
        private BigDecimal teamworkScore;
        private ScoreBasis basis;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ScoreBasis {
        private String technicalScore;
        private String attitudeScore;
        private String softSkillsScore;
        private String teamworkScore;
    }
}
