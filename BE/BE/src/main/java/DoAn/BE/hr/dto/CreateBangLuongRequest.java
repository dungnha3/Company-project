package DoAn.BE.hr.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateBangLuongRequest {
    
    @NotNull(message = "ID nhân viên không được để trống")
    private Long nhanvienId;
    
    @NotNull(message = "Tháng không được để trống")
    @Min(value = 1, message = "Tháng phải từ 1-12")
    @Max(value = 12, message = "Tháng phải từ 1-12")
    private Integer thang;
    
    @NotNull(message = "Năm không được để trống")
    @Min(value = 2020, message = "Năm phải từ 2020 trở đi")
    private Integer nam;
    
    @NotNull(message = "Lương cơ bản không được để trống")
    @Min(value = 0, message = "Lương cơ bản phải >= 0")
    private BigDecimal luongCoBan;
    
    @Min(value = 0, message = "Số ngày công phải >= 0")
    private Integer ngayCong;
    
    @Min(value = 1, message = "Số ngày công chuẩn phải >= 1")
    private Integer ngayCongChuan;
    
    private BigDecimal phuCap;
    private BigDecimal thuong;
    
    @Min(value = 0, message = "Giờ làm thêm phải >= 0")
    private Integer gioLamThem;
    
    private BigDecimal khauTruKhac;
    private String ghiChu;
}
