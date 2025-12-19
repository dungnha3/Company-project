package DoAn.BE.hr.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PhongBanRequest {
    
    @NotBlank(message = "Tên phòng ban không được để trống")
    private String tenPhongBan;
    
    private String moTa;
    private Long truongPhongId;
}
