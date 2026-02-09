package DoAn.BE.analytics.dto;

import java.util.List;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StatusDistributionDTO {
    private Long projectId;
    private int totalIssues;
    private List<StatusCountDTO> distribution;
}
