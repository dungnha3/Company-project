package DoAn.BE.smart.dto;

import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkloadAnalysisDTO {
    private int balanceScore; // 0-100
    private List<MemberWorkload> members;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MemberWorkload {
        private Long userId;
        private String username;
        private String fullName;
        private int activeTasks;
        private BigDecimal totalHours;
        private int totalWeight;
        private String workloadLevel; // QUÁ_TẢI, BẬN, BÌNH_THƯỜNG, NHẸ
        private String color; // red, orange, green, blue
    }
}
