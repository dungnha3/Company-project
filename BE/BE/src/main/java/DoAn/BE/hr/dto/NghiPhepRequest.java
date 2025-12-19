package DoAn.BE.hr.dto;

import java.time.LocalDate;

import DoAn.BE.hr.entity.NghiPhep.LoaiPhep;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NghiPhepRequest {
    
    @NotNull(message = "ID nhân viên không được để trống")
    private Long nhanvienId;
    
    @NotNull(message = "Loại phép không được để trống")
    private LoaiPhep loaiPhep;
    
    @NotNull(message = "Ngày bắt đầu không được để trống")
    private LocalDate ngayBatDau;
    
    @NotNull(message = "Ngày kết thúc không được để trống")
    private LocalDate ngayKetThuc;
    
    private String lyDo;
}
