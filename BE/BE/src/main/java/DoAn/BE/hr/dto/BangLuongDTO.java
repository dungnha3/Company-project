package DoAn.BE.hr.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BangLuongDTO {
    private Long bangluongId;
    private Long nhanvienId;
    private String hoTenNhanVien;
    private Integer thang;
    private Integer nam;
    private String period; // Format: MM/YYYY
    
    // Các khoản thu nhập
    private BigDecimal luongCoBan;
    private Integer ngayCong;
    private Integer ngayCongChuan;
    private BigDecimal luongTheoNgayCong;
    private BigDecimal phuCap;
    private BigDecimal thuong;
    private Integer gioLamThem;
    private BigDecimal tienLamThem;
    
    // Các khoản khấu trừ
    private BigDecimal bhxh;
    private BigDecimal bhyt;
    private BigDecimal bhtn;
    private BigDecimal thueTNCN;
    private BigDecimal khauTruKhac;
    
    // Tổng kết
    private BigDecimal tongLuong;
    private BigDecimal tongKhauTru;
    private BigDecimal luongThucNhan;
    
    private String trangThai;
    private String ghiChu;
    private LocalDateTime createdAt;
}
