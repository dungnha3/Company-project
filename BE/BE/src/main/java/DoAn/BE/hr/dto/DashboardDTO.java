package DoAn.BE.hr.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardDTO {
    
    // Thống kê nhân viên
    private long tongNhanVien;
    private long nhanVienDangLam;
    private long nhanVienNghiViec;
    
    // Thống kê nghỉ phép
    private long donNghiPhepChoDuyet;
    private long donNghiPhepDaDuyet;
    private long donNghiPhepTuChoi;
    
    // Thống kê bảng lương
    private long bangLuongChuaThanhToan;
    private long bangLuongDaThanhToan;
    private BigDecimal tongLuongThangNay;
    
    // Thống kê hợp đồng
    private long hopDongHieuLuc;
    private long hopDongSapHetHan; // Trong 30 ngày
    private long hopDongHetHan;
    
    // Thống kê chấm công
    private long tongChamCongThangNay;
    private long nhanVienDiTre;
    private long nhanVienVeSom;
    
    // Danh sách cần xử lý
    private List<HopDongExpiringDTO> hopDongSapHetHanList;
    private List<NghiPhepPendingDTO> donNghiPhepChoXuLy;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HopDongExpiringDTO {
        private Long hopdongId;
        private String tenNhanVien;
        private String ngayKetThuc;
        private int soNgayConLai;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NghiPhepPendingDTO {
        private Long nghiphepId;
        private String tenNhanVien;
        private String loaiPhep;
        private String ngayBatDau;
        private String ngayKetThuc;
        private int soNgay;
    }
}
