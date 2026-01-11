package DoAn.BE.analytics.dto;

import java.math.BigDecimal;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeamWorkloadDTO {
    private Long projectId;
    private BigDecimal totalLoggedHours;
}
