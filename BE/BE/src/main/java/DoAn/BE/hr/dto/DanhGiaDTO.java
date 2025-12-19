package DoAn.BE.hr.dto;

import DoAn.BE.hr.entity.DanhGia.LoaiDanhGia;
import DoAn.BE.hr.entity.DanhGia.TrangThaiDanhGia;
import DoAn.BE.hr.entity.DanhGia.XepLoai;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DanhGiaDTO {
    
    private Long danhGiaId;
    private Long nhanvienId;
    private String tenNhanVien;
    private String avatar; // Avatar nhân viên
    private String emailNhanVien;
    private String phongBan;
    private String chucVu;
    
    private Long nguoiDanhGiaId;
    private String tenNguoiDanhGia;
    
    private String kyDanhGia;
    private LoaiDanhGia loaiDanhGia;
    
    private BigDecimal diemChuyenMon;
    private BigDecimal diemThaiDo;
    private BigDecimal diemKyNangMem;
    private BigDecimal diemDongDoi;
    private BigDecimal diemTong;
    
    private XepLoai xepLoai;
    private String nhanXet;
    private String mucTieuTiepTheo;
    private String keHoachPhatTrien;
    
    private TrangThaiDanhGia trangThai;
    private LocalDate ngayBatDau;
    private LocalDate ngayKetThuc;
    private LocalDate ngayHoanThanh;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
