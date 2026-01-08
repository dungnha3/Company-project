package DoAn.BE.hrm.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceGPSRequest {

    // If null, will be taken from current user
    private Long employeeId;

    @NotNull(message = "Latitude cannot be null")
    private Double latitude;

    @NotNull(message = "Longitude cannot be null")
    private Double longitude;

    private String checkInAddress;
}
