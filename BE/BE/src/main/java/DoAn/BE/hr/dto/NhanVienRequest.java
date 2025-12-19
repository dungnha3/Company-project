package DoAn.BE.hr.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import DoAn.BE.hr.entity.NhanVien.GioiTinh;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NhanVienRequest {
    
    @NotNull(message = "User ID không được để trống")
    private Long userId;
    
    @NotBlank(message = "Họ tên không được để trống")
    private String hoTen;
    
    private String cccd;
    
    @NotNull(message = "Ngày sinh không được để trống")
    private LocalDate ngaySinh;
    
    @NotNull(message = "Giới tính không được để trống")
    private GioiTinh gioiTinh;
    
    private String diaChi;
    
    @NotNull(message = "Ngày vào làm không được để trống")
    private LocalDate ngayVaoLam;
    
    private Long phongbanId;
    private Long chucvuId;
    
    @Min(value = 0, message = "Lương cơ bản phải >= 0")
    private BigDecimal luongCoBan;
    
    @Min(value = 0, message = "Phụ cấp phải >= 0")
    private BigDecimal phuCap;
}
