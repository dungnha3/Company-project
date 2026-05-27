package DoAn.BE.smart.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SprintDelayPredictionDTO {

    private Long sprintId;
    private String sprintName;

    private Double onTimeConfidence;  // 0.0 - 1.0, null if not enough data
    private String predictionConfidence; // "high" | "medium" | "low"
    private String alertLevel;        // "OK" | "WARNING" | "CRITICAL"

    private LocalDate predictedCompletionDate;
    private Integer daysRemaining;
    private Integer totalSprintDays;
    private Integer daysElapsed;

    private BigDecimal totalIssues;
    private BigDecimal completedIssues;
    private Double currentCompletionRate;
    private Double requiredCompletionRate;

    private List<String> recommendations;
    private AutoTuningInfo autoTuningInfo;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AutoTuningInfo {
        private double alpha;    // level smoothing factor used
        private double beta;     // trend smoothing factor used
        private String source;   // "auto-tuned" or "default"
        private int historicalSprintsUsed;
    }

    public static SprintDelayPredictionDTO notEnoughData(Long sprintId, String message) {
        return SprintDelayPredictionDTO.builder()
                .sprintId(sprintId)
                .onTimeConfidence(null)
                .predictionConfidence("low")
                .alertLevel("OK")
                .recommendations(List.of(message))
                .build();
    }

    public static SprintDelayPredictionDTO noActiveSprint() {
        return SprintDelayPredictionDTO.builder()
                .alertLevel("OK")
                .recommendations(List.of("Không có sprint đang hoạt động"))
                .build();
    }
}
