package DoAn.BE.hr.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import DoAn.BE.hr.entity.HopDong.LoaiHopDong;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class HopDongRequest {
    
    @NotNull(message = "ID nhân viên không được để trống")
    private Long nhanvienId;
    
    @NotNull(message = "Loại hợp đồng không được để trống")
    private LoaiHopDong loaiHopDong;
    
    @NotNull(message = "Ngày bắt đầu không được để trống")
    private LocalDate ngayBatDau;
    
    private LocalDate ngayKetThuc; // Null nếu vô thời hạn
    
    @NotNull(message = "Lương cơ bản không được để trống")
    @Min(value = 0, message = "Lương cơ bản phải >= 0")
    private BigDecimal luongCoBan;
    
    private String noiDung;
}
