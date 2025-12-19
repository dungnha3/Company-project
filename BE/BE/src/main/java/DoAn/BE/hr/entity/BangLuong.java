package DoAn.BE.hr.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@Entity
@Table(name = "bang_luong")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BangLuong {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "bangluong_id")
    private Long bangluongId;

    @ManyToOne
    @JoinColumn(name = "nhanvien_id", nullable = false)
    private NhanVien nhanVien;

    @Column(name = "thang", nullable = false)
    private Integer thang;

    @Column(name = "nam", nullable = false)
    private Integer nam;

    @Column(name = "luong_co_ban", nullable = false, precision = 15, scale = 2)
    private BigDecimal luongCoBan;

    @Column(name = "ngay_cong")
    private Integer ngayCong = 0;

    @Column(name = "ngay_cong_chuan")
    private Integer ngayCongChuan = 26; // Số ngày công chuẩn trong tháng

    @Column(name = "luong_theo_ngay_cong", precision = 15, scale = 2)
    private BigDecimal luongTheoNgayCong = BigDecimal.ZERO;

    @Column(name = "phu_cap", precision = 15, scale = 2)
    private BigDecimal phuCap = BigDecimal.ZERO;

    @Column(name = "thuong", precision = 15, scale = 2)
    private BigDecimal thuong = BigDecimal.ZERO;

    @Column(name = "gio_lam_them")
    private Integer gioLamThem = 0;

    @Column(name = "tien_lam_them", precision = 15, scale = 2)
    private BigDecimal tienLamThem = BigDecimal.ZERO;

    // Các khoản khấu trừ
    @Column(name = "bhxh", precision = 15, scale = 2)
    private BigDecimal bhxh = BigDecimal.ZERO; // 8% lương cơ bản

    @Column(name = "bhyt", precision = 15, scale = 2)
    private BigDecimal bhyt = BigDecimal.ZERO; // 1.5% lương cơ bản

    @Column(name = "bhtn", precision = 15, scale = 2)
    private BigDecimal bhtn = BigDecimal.ZERO; // 1% lương cơ bản

    @Column(name = "thue_tncn", precision = 15, scale = 2)
    private BigDecimal thueTNCN = BigDecimal.ZERO;

    @Column(name = "khau_tru_khac", precision = 15, scale = 2)
    private BigDecimal khauTruKhac = BigDecimal.ZERO;

    @Column(name = "tong_luong", nullable = false, precision = 15, scale = 2)
    private BigDecimal tongLuong; // Tổng các khoản cộng

    @Column(name = "tong_khau_tru", precision = 15, scale = 2)
    private BigDecimal tongKhauTru = BigDecimal.ZERO; // Tổng các khoản trừ

    @Column(name = "luong_thuc_nhan", nullable = false, precision = 15, scale = 2)
    private BigDecimal luongThucNhan; // Lương thực nhận = tongLuong - tongKhauTru

    @Column(name = "trang_thai", length = 50)
    private String trangThai = "CHUA_THANH_TOAN"; // CHUA_THANH_TOAN, DA_THANH_TOAN, DA_HUY

    @Column(name = "ghi_chu", length = 500)
    private String ghiChu;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        calculateTotalSalary();
    }

    @PreUpdate
    protected void onUpdate() {
        calculateTotalSalary();
    }

    private void calculateTotalSalary() {
        // 1. Tính lương theo ngày công
        BigDecimal base = luongCoBan != null ? luongCoBan : BigDecimal.ZERO;
        if (ngayCong != null && ngayCong > 0 && ngayCongChuan != null && ngayCongChuan > 0) {
            this.luongTheoNgayCong = base
                .divide(new BigDecimal(ngayCongChuan), 2, RoundingMode.HALF_UP)
                .multiply(new BigDecimal(ngayCong));
        } else {
            this.luongTheoNgayCong = base;
        }

        // 2. Tính tiền làm thêm giờ (1.5 lần lương giờ)
        if (gioLamThem != null && gioLamThem > 0) {
            BigDecimal luongGio = base.divide(new BigDecimal(ngayCongChuan * 8), 2, RoundingMode.HALF_UP);
            this.tienLamThem = luongGio.multiply(new BigDecimal(gioLamThem)).multiply(new BigDecimal("1.5"));
        } else {
            this.tienLamThem = BigDecimal.ZERO;
        }

        // 3. Tính các khoản bảo hiểm (dựa trên lương cơ bản)
        this.bhxh = base.multiply(new BigDecimal("0.08")); // 8%
        this.bhyt = base.multiply(new BigDecimal("0.015")); // 1.5%
        this.bhtn = base.multiply(new BigDecimal("0.01")); // 1%

        // 4. Tính tổng thu nhập trước thuế
        BigDecimal allowance = phuCap != null ? phuCap : BigDecimal.ZERO;
        BigDecimal bonus = thuong != null ? thuong : BigDecimal.ZERO;
        BigDecimal overtime = tienLamThem != null ? tienLamThem : BigDecimal.ZERO;
        
        this.tongLuong = luongTheoNgayCong.add(allowance).add(bonus).add(overtime);

        // 5. Tính thuế TNCN (thu nhập cá nhân)
        BigDecimal thuNhapTinhThue = tongLuong.subtract(bhxh).subtract(bhyt).subtract(bhtn);
        BigDecimal giamTruBanThan = new BigDecimal("11000000"); // 11 triệu
        BigDecimal thuNhapChiuThue = thuNhapTinhThue.subtract(giamTruBanThan);
        
        if (thuNhapChiuThue.compareTo(BigDecimal.ZERO) > 0) {
            this.thueTNCN = calculatePersonalIncomeTax(thuNhapChiuThue);
        } else {
            this.thueTNCN = BigDecimal.ZERO;
        }

        // 6. Tính tổng khấu trừ
        BigDecimal otherDeduction = khauTruKhac != null ? khauTruKhac : BigDecimal.ZERO;
        this.tongKhauTru = bhxh.add(bhyt).add(bhtn).add(thueTNCN).add(otherDeduction);

        // 7. Tính lương thực nhận
        this.luongThucNhan = tongLuong.subtract(tongKhauTru);
    }

    // Tính thuế TNCN theo bậc thang lũy tiến
    private BigDecimal calculatePersonalIncomeTax(BigDecimal taxableIncome) {
        BigDecimal tax = BigDecimal.ZERO;
        
        // Bậc 1: đến 5 triệu - 5%
        if (taxableIncome.compareTo(new BigDecimal("5000000")) <= 0) {
            tax = taxableIncome.multiply(new BigDecimal("0.05"));
        }
        // Bậc 2: trên 5 triệu đến 10 triệu - 10%
        else if (taxableIncome.compareTo(new BigDecimal("10000000")) <= 0) {
            tax = new BigDecimal("5000000").multiply(new BigDecimal("0.05"))
                .add(taxableIncome.subtract(new BigDecimal("5000000")).multiply(new BigDecimal("0.10")));
        }
        // Bậc 3: trên 10 triệu đến 18 triệu - 15%
        else if (taxableIncome.compareTo(new BigDecimal("18000000")) <= 0) {
            tax = new BigDecimal("250000") // 5tr * 5%
                .add(new BigDecimal("500000")) // 5tr * 10%
                .add(taxableIncome.subtract(new BigDecimal("10000000")).multiply(new BigDecimal("0.15")));
        }
        // Bậc 4: trên 18 triệu đến 32 triệu - 20%
        else if (taxableIncome.compareTo(new BigDecimal("32000000")) <= 0) {
            tax = new BigDecimal("250000")
                .add(new BigDecimal("500000"))
                .add(new BigDecimal("1200000")) // 8tr * 15%
                .add(taxableIncome.subtract(new BigDecimal("18000000")).multiply(new BigDecimal("0.20")));
        }
        // Bậc 5: trên 32 triệu đến 52 triệu - 25%
        else if (taxableIncome.compareTo(new BigDecimal("52000000")) <= 0) {
            tax = new BigDecimal("250000")
                .add(new BigDecimal("500000"))
                .add(new BigDecimal("1200000"))
                .add(new BigDecimal("2800000")) // 14tr * 20%
                .add(taxableIncome.subtract(new BigDecimal("32000000")).multiply(new BigDecimal("0.25")));
        }
        // Bậc 6: trên 52 triệu đến 80 triệu - 30%
        else if (taxableIncome.compareTo(new BigDecimal("80000000")) <= 0) {
            tax = new BigDecimal("250000")
                .add(new BigDecimal("500000"))
                .add(new BigDecimal("1200000"))
                .add(new BigDecimal("2800000"))
                .add(new BigDecimal("5000000")) // 20tr * 25%
                .add(taxableIncome.subtract(new BigDecimal("52000000")).multiply(new BigDecimal("0.30")));
        }
        // Bậc 7: trên 80 triệu - 35%
        else {
            tax = new BigDecimal("250000")
                .add(new BigDecimal("500000"))
                .add(new BigDecimal("1200000"))
                .add(new BigDecimal("2800000"))
                .add(new BigDecimal("5000000"))
                .add(new BigDecimal("8400000")) // 28tr * 30%
                .add(taxableIncome.subtract(new BigDecimal("80000000")).multiply(new BigDecimal("0.35")));
        }
        
        return tax.setScale(0, RoundingMode.HALF_UP);
    }

    public String getPeriod() {
        return String.format("%02d/%d", thang, nam);
    }

    public boolean isValidPeriod() {
        return thang >= 1 && thang <= 12 && nam >= 2020;
    }
}
