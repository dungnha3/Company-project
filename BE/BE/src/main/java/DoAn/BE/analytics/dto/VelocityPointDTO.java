package DoAn.BE.analytics.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VelocityPointDTO {
    private Long sprintId;
    private String sprintName;
    private int completedIssues;
}
