package DoAn.BE.smart.dto;

import lombok.*;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectRiskDTO {
    private int riskScore; // 0-100, high = dangerous
    private String label; // Thấp, Trung bình, Cao, Nghiêm trọng
    private String color; // green, yellow, orange, red
    private List<RiskFactor> riskFactors;
    private List<String> recommendations;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RiskFactor {
        private String type; // deadline, sprint, workload, scope, capacity
        private String label;
        private String description;
        private int score; // contribution to total risk
        private String severity; // low, medium, high
    }
}
