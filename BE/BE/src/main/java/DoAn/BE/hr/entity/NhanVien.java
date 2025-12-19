package DoAn.BE.hr.entity;

import DoAn.BE.hr.converter.GioiTinhConverter;
import DoAn.BE.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "nhan_vien")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class NhanVien {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "nhanvien_id")
    private Long nhanvienId;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "ho_ten", nullable = false, length = 100, columnDefinition = "NVARCHAR(100)")
    private String hoTen;

    @Column(name = "cccd", unique = true, length = 20)
    private String cccd;

    @Column(name = "ngay_sinh", nullable = false)
    private LocalDate ngaySinh;

    @Convert(converter = GioiTinhConverter.class)
    @Column(name = "gioi_tinh", nullable = false, length = 10, columnDefinition = "NVARCHAR(10)")
    private GioiTinh gioiTinh;

    @Column(name = "dia_chi", length = 255, columnDefinition = "NVARCHAR(255)")
    private String diaChi;

    @Column(name = "sdt", length = 20, columnDefinition = "VARCHAR(20)")
    private String sdt;

    @Column(name = "ngay_vao_lam", nullable = false)
    private LocalDate ngayVaoLam;

    @Enumerated(EnumType.STRING)
    @Column(name = "trang_thai", length = 50)
    private TrangThaiNhanVien trangThai = TrangThaiNhanVien.DANG_LAM_VIEC;

    @ManyToOne
    @JoinColumn(name = "phongban_id")
    private PhongBan phongBan;

    @ManyToOne
    @JoinColumn(name = "chucvu_id")
    private ChucVu chucVu;

    @Column(name = "luong_co_ban", precision = 15, scale = 2)
    private BigDecimal luongCoBan = BigDecimal.ZERO;

    @Column(name = "phu_cap", precision = 15, scale = 2)
    private BigDecimal phuCap = BigDecimal.ZERO;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "nhanVien", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<HopDong> hopDongs;

    @OneToMany(mappedBy = "nhanVien", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<ChamCong> chamCongs;

    @OneToMany(mappedBy = "nhanVien", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<BangLuong> bangLuongs;

    @OneToMany(mappedBy = "nhanVien", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<NghiPhep> nghiPheps;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public enum GioiTinh {
        Nam, Nữ, Khác
    }

    public enum TrangThaiNhanVien {
        DANG_LAM_VIEC,
        NGHI_VIEC,
        TAM_NGHI
    }
}
