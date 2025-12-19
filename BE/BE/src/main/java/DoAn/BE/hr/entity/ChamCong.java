package DoAn.BE.hr.entity;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "cham_cong")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChamCong {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "chamcong_id")
    private Long chamcongId;

    @ManyToOne
    @JoinColumn(name = "nhanvien_id", nullable = false)
    private NhanVien nhanVien;

    @Column(name = "ngay_cham", nullable = false)
    private LocalDate ngayCham;

    @Column(name = "gio_vao")
    private LocalTime gioVao;

    @Column(name = "gio_ra")
    private LocalTime gioRa;

    @Column(name = "so_gio_lam", precision = 5, scale = 2)
    private BigDecimal soGioLam = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "trang_thai", length = 30)
    private TrangThaiChamCong trangThai;

    @Column(name = "ghi_chu", length = 500)
    private String ghiChu;

    // GPS fields
    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "dia_chi_checkin", length = 500)
    private String diaChiCheckin;

    @Column(name = "khoang_cach")
    private Double khoangCach; // Khoảng cách từ công ty (meters)

    @Enumerated(EnumType.STRING)
    @Column(name = "phuong_thuc", length = 20)
    private PhuongThucChamCong phuongThuc = PhuongThucChamCong.MANUAL;

    @Enumerated(EnumType.STRING)
    @Column(name = "loai_ca", length = 20)
    private LoaiCa loaiCa = LoaiCa.FULL;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        calculateWorkingHours();
        autoDetectStatus();
    }

    @PreUpdate
    protected void onUpdate() {
        calculateWorkingHours();
        autoDetectStatus();
    }

    private void calculateWorkingHours() {
        if (gioVao != null && gioRa != null) {
            long minutes = java.time.Duration.between(gioVao, gioRa).toMinutes();
            this.soGioLam = BigDecimal.valueOf(minutes).divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
        }
    }

    /**
     * Tự động xác định trạng thái chấm công
     */
    private void autoDetectStatus() {
        if (trangThai == null && gioVao != null) {
            LocalTime gioVaoChuan = LocalTime.of(8, 0);
            // Đi trễ nếu check-in sau 8:00
            if (gioVao.isAfter(gioVaoChuan)) {
                this.trangThai = TrangThaiChamCong.DI_TRE;
            } else if (gioRa != null && isEarlyLeave()) {
                this.trangThai = TrangThaiChamCong.VE_SOM;
            } else if (gioRa != null) {
                this.trangThai = TrangThaiChamCong.DU_GIO;
            }
        }
    }

    public boolean isLate() {
        // Giờ làm việc bắt đầu lúc 8:00
        // Tính đi trễ nếu đến sau 8:00
        LocalTime gioVaoChuan = LocalTime.of(8, 0);
        return gioVao != null && gioVao.isAfter(gioVaoChuan);
    }

    public boolean isEarlyLeave() {
        // Giờ làm việc kết thúc lúc 17:00
        // Tính về sớm nếu về trước 17:00
        LocalTime gioRaChuan = LocalTime.of(17, 0);
        return gioRa != null && gioRa.isBefore(gioRaChuan);
    }

    public enum TrangThaiChamCong {
        DI_TRE,
        VE_SOM,
        DU_GIO,
        NGHI_PHEP,
        NGHI_KHONG_PHEP
    }

    public enum PhuongThucChamCong {
        GPS,
        MANUAL,
        QR_CODE,
        FACE_ID
    }

    public enum LoaiCa {
        SANG,
        CHIEU,
        TOI,
        FULL
    }
}
