package DoAn.BE.smart.dto;

import lombok.*;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TitleSuggestionDTO {

    private Map<Long, SkillMatch> suggestions; // userId -> suggestion
    private int totalKeywords;
    private String topKeyword;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SkillMatch {
        private Long userId;
        private String fullName;
        private int totalScore;
        private double skillMatchScore;
        private double velocityScore;
        private int relatedTaskCount;
        private String reason;
    }
}
