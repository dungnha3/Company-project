package DoAn.BE.smart.dto;

import lombok.*;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SmartSubtaskDTO {

    private List<SubtaskSuggestion> suggestions;
    private int totalMatched;
    private List<String> matchedKeywords;
    private String method; // "rule-based"

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SubtaskSuggestion {
        private String title;
        private String category; // "backend", "frontend", "devops", "testing", "auth", "reporting"
        private int relevanceScore; // 0-100
    }

    public static SmartSubtaskDTO empty() {
        return SmartSubtaskDTO.builder()
                .suggestions(List.of())
                .totalMatched(0)
                .matchedKeywords(List.of())
                .method("rule-based")
                .build();
    }
}
