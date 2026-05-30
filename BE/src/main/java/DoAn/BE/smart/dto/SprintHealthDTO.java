package DoAn.BE.smart.dto;

import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SprintHealthDTO {
    private int healthScore; // 0-100
    private String label; // Tốt, Khá, Cảnh báo, Nguy hiểm
    private String color; // green, yellow, orange, red
    private HealthMetrics metrics;
    private String recommendation;
    private SprintInfo sprint;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class HealthMetrics {
        private int completionRate; // 0-100
        private int onTimeRate; // 0-100
        private int reworkRate; // 0-100 (100 = no rework)
        private int velocityAccuracy; // 0-100
        private int burnoutRisk; // 0-100 (lower is better)
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SprintInfo {
        private Long sprintId;
        private String name;
        private BigDecimal actualHours;
        private BigDecimal estimatedHours;
        private String daysRemaining; // "Còn X ngày" or "Đã kết thúc"
        private String status;
    }
}
