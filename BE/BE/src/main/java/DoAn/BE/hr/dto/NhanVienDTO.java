package DoAn.BE.hr.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import DoAn.BE.hr.entity.NhanVien.GioiTinh;
import DoAn.BE.hr.entity.NhanVien.TrangThaiNhanVien;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NhanVienDTO {
    private Long nhanvienId;
    private Long userId;
    private String username;
    private String email;
    private String avatarUrl;
    private String sdt;
    private String hoTen;
    private String cccd;
    private LocalDate ngaySinh;
    private GioiTinh gioiTinh;
    private String diaChi;
    private LocalDate ngayVaoLam;
    private TrangThaiNhanVien trangThai;
    private Long phongbanId;
    private String tenPhongBan;
    private Long chucvuId;
    private String tenChucVu;
    private BigDecimal luongCoBan;
    private BigDecimal phuCap;
    private LocalDateTime createdAt;
}
