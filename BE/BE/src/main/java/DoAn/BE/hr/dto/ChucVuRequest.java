package DoAn.BE.hr.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChucVuRequest {
    
    @NotBlank(message = "Tên chức vụ không được để trống")
    private String tenChucVu;
    
    private String moTa;
    
    private String icon;
    
    private Double heSoLuong;
    
    @Min(value = 1, message = "Level phải >= 1")
    private Integer level;
}
