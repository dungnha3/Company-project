package DoAn.BE.analytics.dto;

import java.util.List;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VelocityDataDTO {
    private Long projectId;
    private List<VelocityPointDTO> sprints;
    private double averageVelocity;
}
