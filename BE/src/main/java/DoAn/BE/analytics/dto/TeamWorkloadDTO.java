package DoAn.BE.analytics.dto;

import java.math.BigDecimal;
import java.util.List;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeamWorkloadDTO {
    private Long projectId;
    private BigDecimal totalLoggedHours;
    private List<MemberWorkload> members;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MemberWorkload {
        private Long userId;
        private String userName;
        private String avatarUrl;
        private long totalIssues;
        private long completedIssues;
        private long inProgressIssues;
        private long unassignedIssues;
        private double loggedHours;
    }
}
