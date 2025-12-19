package DoAn.BE.hr.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "danh_gia")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DanhGia {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "danhgia_id")
    private Long danhGiaId;
    
    @ManyToOne
    @JoinColumn(name = "nhanvien_id", nullable = false)
    private NhanVien nhanVien;
    
    @ManyToOne
    @JoinColumn(name = "nguoi_danh_gia_id", nullable = false)
    private NhanVien nguoiDanhGia;
    
    @Column(name = "ky_danh_gia", nullable = false, length = 50)
    private String kyDanhGia; // "Q1-2024", "Q2-2024", "2024"
    
    @Enumerated(EnumType.STRING)
    @Column(name = "loai_danh_gia", nullable = false, length = 30)
    private LoaiDanhGia loaiDanhGia;
    
    @Column(name = "diem_chuyen_mon", precision = 3, scale = 1)
    private BigDecimal diemChuyenMon; // 0.0 - 10.0
    
    @Column(name = "diem_thai_do", precision = 3, scale = 1)
    private BigDecimal diemThaiDo;
    
    @Column(name = "diem_ky_nang_mem", precision = 3, scale = 1)
    private BigDecimal diemKyNangMem;
    
    @Column(name = "diem_dong_doi", precision = 3, scale = 1)
    private BigDecimal diemDongDoi;
    
    @Column(name = "diem_tong", precision = 3, scale = 1)
    private BigDecimal diemTong;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "xep_loai", length = 20)
    private XepLoai xepLoai;
    
    @Column(name = "nhan_xet", columnDefinition = "NVARCHAR(MAX)")
    private String nhanXet;
    
    @Column(name = "muc_tieu_tiep_theo", columnDefinition = "NVARCHAR(MAX)")
    private String mucTieuTiepTheo;
    
    @Column(name = "ke_hoach_phat_trien", columnDefinition = "NVARCHAR(MAX)")
    private String keHoachPhatTrien;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "trang_thai", nullable = false, length = 20)
    private TrangThaiDanhGia trangThai = TrangThaiDanhGia.DANG_DANH_GIA;
    
    @Column(name = "ngay_bat_dau")
    private LocalDate ngayBatDau;
    
    @Column(name = "ngay_ket_thuc")
    private LocalDate ngayKetThuc;
    
    @Column(name = "ngay_hoan_thanh")
    private LocalDate ngayHoanThanh;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        
        // Tự động tính điểm tổng
        calculateTotalScore();
        
        // Tự động xếp loại
        determineRating();
    }
    
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
        
        // Tự động tính điểm tổng
        calculateTotalScore();
        
        // Tự động xếp loại
        determineRating();
    }
    
    private void calculateTotalScore() {
        if (diemChuyenMon != null && diemThaiDo != null && 
            diemKyNangMem != null && diemDongDoi != null) {
            // Trọng số: Chuyên môn 40%, Thái độ 30%, Kỹ năng mềm 20%, Đồng đội 10%
            this.diemTong = diemChuyenMon.multiply(new BigDecimal("0.4"))
                .add(diemThaiDo.multiply(new BigDecimal("0.3")))
                .add(diemKyNangMem.multiply(new BigDecimal("0.2")))
                .add(diemDongDoi.multiply(new BigDecimal("0.1")));
        }
    }
    
    private void determineRating() {
        if (diemTong != null) {
            if (diemTong.compareTo(new BigDecimal("9.0")) >= 0) {
                this.xepLoai = XepLoai.XUAT_SAC;
            } else if (diemTong.compareTo(new BigDecimal("8.0")) >= 0) {
                this.xepLoai = XepLoai.TOT;
            } else if (diemTong.compareTo(new BigDecimal("6.5")) >= 0) {
                this.xepLoai = XepLoai.KHA;
            } else if (diemTong.compareTo(new BigDecimal("5.0")) >= 0) {
                this.xepLoai = XepLoai.TRUNG_BINH;
            } else {
                this.xepLoai = XepLoai.YEU;
            }
        }
    }
    
    public enum LoaiDanhGia {
        HANG_QUY,      // Đánh giá hàng quý
        HANG_NAM,      // Đánh giá hàng năm
        THU_VIEC,      // Đánh giá thử việc
        THANG_CHUC,    // Đánh giá thăng chức
        DANG_KY_TANG_LUONG // Đánh giá tăng lương
    }
    
    public enum XepLoai {
        XUAT_SAC,      // 9.0 - 10.0
        TOT,           // 8.0 - 8.9
        KHA,           // 6.5 - 7.9
        TRUNG_BINH,    // 5.0 - 6.4
        YEU            // < 5.0
    }
    
    public enum TrangThaiDanhGia {
        DANG_DANH_GIA,
        CHO_DUYET,
        DA_DUYET,
        TU_CHOI
    }
}
