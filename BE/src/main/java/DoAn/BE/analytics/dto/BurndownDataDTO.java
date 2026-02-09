package DoAn.BE.analytics.dto;

import java.time.LocalDate;
import java.util.List;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BurndownDataDTO {
    private Long sprintId;
    private String sprintName;
    private LocalDate startDate;
    private LocalDate endDate;
    private int totalIssues;
    private int completedIssues;
    private List<BurndownPointDTO> dataPoints;
}
