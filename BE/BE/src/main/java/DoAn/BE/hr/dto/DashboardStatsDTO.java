package DoAn.BE.hr.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsDTO {

    // Thống kê tổng quan
    private TongQuanStats tongQuan;

    // Biểu đồ chấm công theo phòng ban
    private List<ChamCongPhongBanStats> chamCongPhongBan;

    // Biểu đồ lương theo tháng
    private List<LuongTheoThangStats> luongTheoThang;

    // Thống kê nghỉ phép
    private List<NghiPhepStats> nghiPhep;

    // Thống kê hợp đồng
    private HopDongStats hopDong;

    // Thống kê nhân viên theo độ tuổi
    private List<NhanVienTheoTuoiStats> nhanVienTheoTuoi;

    // Thống kê nhân viên theo giới tính
    private Map<String, Long> nhanVienTheoGioiTinh;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TongQuanStats {
        private long tongNhanVien;
        private long nhanVienDangLam;
        private long nhanVienNghiViec;
        private long donNghiPhepChoDuyet;
        private long bangLuongChoDuyet;
        private long hopDongHetHan30Ngay;
        private long thongBaoChuaDoc;
        private BigDecimal tongChiPhiLuongThang;
        private BigDecimal tongDoanhThu;
        private BigDecimal loiNhuan;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChamCongPhongBanStats {
        private String tenPhongBan;
        private long tongNhanVien;
        private long nhanVienDiMuon;
        private long nhanVienVeSom;
        private long nhanVienDungGio;
        private double tiLeDungGio; // %
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LuongTheoThangStats {
        private String thangNam; // MM/yyyy
        private BigDecimal tongLuong;
        private long soNhanVien;
        private BigDecimal luongTrungBinh;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NghiPhepStats {
        private String loaiNghi;
        private long soLuong;
        private long choDuyet;
        private long daDuyet;
        private long tuChoi;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HopDongStats {
        private long tongHopDong;
        private long hopDongConHieuLuc;
        private long hopDongHetHan;
        private long hopDongSapHetHan; // 30 ngày tới
        private Map<String, Long> hopDongTheoLoai;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NhanVienTheoTuoiStats {
        private String nhomTuoi; // "20-25", "26-30", etc.
        private long soLuong;
        private double tiLe; // %
    }
}
