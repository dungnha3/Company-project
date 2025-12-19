package DoAn.BE.hr.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "hop_dong")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class HopDong {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "hopdong_id")
    private Long hopdongId;

    @ManyToOne
    @JoinColumn(name = "nhanvien_id", nullable = false)
    private NhanVien nhanVien;

    @Enumerated(EnumType.STRING)
    @Column(name = "loai_hop_dong", nullable = false, length = 50)
    private LoaiHopDong loaiHopDong;

    @Column(name = "ngay_bat_dau", nullable = false)
    private LocalDate ngayBatDau;

    @Column(name = "ngay_ket_thuc")
    private LocalDate ngayKetThuc;

    @Column(name = "luong_co_ban", nullable = false, precision = 15, scale = 2)
    private BigDecimal luongCoBan;

    @Column(name = "noi_dung", columnDefinition = "NVARCHAR(MAX)")
    private String noiDung;

    @Enumerated(EnumType.STRING)
    @Column(name = "trang_thai", length = 30)
    private TrangThaiHopDong trangThai = TrangThaiHopDong.HIEU_LUC;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public boolean isExpired() {
        return ngayKetThuc != null && ngayKetThuc.isBefore(LocalDate.now());
    }

    public enum LoaiHopDong {
        THU_VIEC,
        XAC_DINH,
        VO_THOI_HAN
    }

    public enum TrangThaiHopDong {
        HIEU_LUC,
        HET_HAN,
        BI_HUY
    }
}
