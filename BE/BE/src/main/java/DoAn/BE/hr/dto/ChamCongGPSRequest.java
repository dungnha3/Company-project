package DoAn.BE.hr.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChamCongGPSRequest {
    
    // Nếu null, sẽ tự động lấy từ user hiện tại
    private Long nhanvienId;
    
    @NotNull(message = "Latitude không được để trống")
    private Double latitude;
    
    @NotNull(message = "Longitude không được để trống")
    private Double longitude;
    
    private String diaChiCheckin;
}
