package DoAn.BE.hr.dto;

import DoAn.BE.hr.entity.DanhGia.LoaiDanhGia;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DanhGiaRequest {
    
    @NotNull(message = "ID nhân viên không được để trống")
    private Long nhanvienId;
    
    @NotBlank(message = "Kỳ đánh giá không được để trống")
    @Size(max = 50, message = "Kỳ đánh giá không được quá 50 ký tự")
    private String kyDanhGia;
    
    @NotNull(message = "Loại đánh giá không được để trống")
    private LoaiDanhGia loaiDanhGia;
    
    @NotNull(message = "Điểm chuyên môn không được để trống")
    @DecimalMin(value = "0.0", message = "Điểm chuyên môn phải >= 0")
    @DecimalMax(value = "10.0", message = "Điểm chuyên môn phải <= 10")
    private BigDecimal diemChuyenMon;
    
    @NotNull(message = "Điểm thái độ không được để trống")
    @DecimalMin(value = "0.0", message = "Điểm thái độ phải >= 0")
    @DecimalMax(value = "10.0", message = "Điểm thái độ phải <= 10")
    private BigDecimal diemThaiDo;
    
    @NotNull(message = "Điểm kỹ năng mềm không được để trống")
    @DecimalMin(value = "0.0", message = "Điểm kỹ năng mềm phải >= 0")
    @DecimalMax(value = "10.0", message = "Điểm kỹ năng mềm phải <= 10")
    private BigDecimal diemKyNangMem;
    
    @NotNull(message = "Điểm đồng đội không được để trống")
    @DecimalMin(value = "0.0", message = "Điểm đồng đội phải >= 0")
    @DecimalMax(value = "10.0", message = "Điểm đồng đội phải <= 10")
    private BigDecimal diemDongDoi;
    
    @Size(max = 2000, message = "Nhận xét không được quá 2000 ký tự")
    private String nhanXet;
    
    @Size(max = 1000, message = "Mục tiêu tiếp theo không được quá 1000 ký tự")
    private String mucTieuTiepTheo;
    
    @Size(max = 1000, message = "Kế hoạch phát triển không được quá 1000 ký tự")
    private String keHoachPhatTrien;
    
    @NotNull(message = "Ngày bắt đầu không được để trống")
    private LocalDate ngayBatDau;
    
    @NotNull(message = "Ngày kết thúc không được để trống")
    private LocalDate ngayKetThuc;
}
