package DoAn.BE.hr.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import DoAn.BE.hr.entity.HopDong.LoaiHopDong;
import DoAn.BE.hr.entity.HopDong.TrangThaiHopDong;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class HopDongDTO {
    private Long hopdongId;
    private Long nhanvienId;
    private String hoTenNhanVien;
    private String avatarUrl;
    private String tenChucVu; // Thêm chức vụ
    private LoaiHopDong loaiHopDong;
    private LocalDate ngayBatDau;
    private LocalDate ngayKetThuc;
    private BigDecimal luongCoBan;
    private String noiDung;
    private TrangThaiHopDong trangThai;
    private LocalDateTime createdAt;

    // Computed fields
    private Boolean isExpired;
    private Integer soNgayConLai; // Số ngày còn lại đến hết hạn
}
