package DoAn.BE.hr.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import DoAn.BE.hr.entity.ChamCong.TrangThaiChamCong;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChamCongRequest {
    
    @NotNull(message = "ID nhân viên không được để trống")
    private Long nhanvienId;
    
    @NotNull(message = "Ngày chấm công không được để trống")
    private LocalDate ngayCham;
    
    private LocalTime gioVao;
    private LocalTime gioRa;
    private TrangThaiChamCong trangThai;
    private String ghiChu;
}
