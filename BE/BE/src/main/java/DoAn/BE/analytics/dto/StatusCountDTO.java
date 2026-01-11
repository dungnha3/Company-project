package DoAn.BE.analytics.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StatusCountDTO {
    private String status;
    private int count;
}
