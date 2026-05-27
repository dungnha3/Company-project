package DoAn.BE.smart.dto;

import java.time.LocalDate;
import java.util.List;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskAssignmentDTO {

    private Long issueId;
    private String issueKey;
    private String title;
    private String issueType;
    private String priority;
    private Integer weight;
    private LocalDate dueDate;
    private Integer reworkCount;
    private boolean isOverdue;

    private SuggestedAssignee suggestedAssignee;
    private List<AlternativeAssignee> alternatives;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SuggestedAssignee {
        private Long userId;
        private String username;
        private String fullName;
        private int score;
        private ScoreBreakdown breakdown;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AlternativeAssignee {
        private Long userId;
        private String username;
        private String fullName;
        private int score;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ScoreBreakdown {
        private int skillMatch;
        private int workload;
        private int history;
        private int availability;
        private int deadline;
        private int loadBalance;
        private int reliability;
    }
}
