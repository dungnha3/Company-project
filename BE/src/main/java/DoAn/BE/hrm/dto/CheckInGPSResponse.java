package DoAn.BE.hrm.dto;

import java.time.LocalTime;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CheckInGPSResponse {
    private boolean success;
    private String message;
    private boolean isCheckIn;
    private LocalTime time;
    private long distance;
    private String status;
}
