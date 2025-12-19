package DoAn.BE.hr.entity;

import DoAn.BE.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "nghi_phep")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class NghiPhep {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "nghiphep_id")
    private Long nghiphepId;

    @ManyToOne
    @JoinColumn(name = "nhanvien_id", nullable = false)
    private NhanVien nhanVien;

    @Enumerated(EnumType.STRING)
    @Column(name = "loai_phep", nullable = false, length = 50)
    private LoaiPhep loaiPhep;

    @Column(name = "ngay_bat_dau", nullable = false)
    private LocalDate ngayBatDau;

    @Column(name = "ngay_ket_thuc", nullable = false)
    private LocalDate ngayKetThuc;

    @Column(name = "so_ngay", nullable = false)
    private Integer soNgay;

    @Column(name = "ly_do", length = 500, columnDefinition = "NVARCHAR(500)")
    private String lyDo;

    @Enumerated(EnumType.STRING)
    @Column(name = "trang_thai", length = 30)
    private TrangThaiNghiPhep trangThai = TrangThaiNghiPhep.CHO_DUYET;

    // PM Approval (Step 1: Kiểm tra tiến độ dự án)
    @ManyToOne
    @JoinColumn(name = "pm_approver_id")
    private User pmApprover;
    
    @Column(name = "pm_approved_at")
    private LocalDateTime pmApprovedAt;
    
    @Column(name = "pm_note", length = 500, columnDefinition = "NVARCHAR(500)")
    private String pmNote;
    
    // Accounting Approval (Step 2: Kiểm tra phép tồn/lương)
    @ManyToOne
    @JoinColumn(name = "accounting_approver_id")
    private User accountingApprover;
    
    @Column(name = "accounting_approved_at")
    private LocalDateTime accountingApprovedAt;
    
    @Column(name = "accounting_note", length = 500, columnDefinition = "NVARCHAR(500)")
    private String accountingNote;
    
    // Legacy fields (giữ để backward compatibility)
    @ManyToOne
    @JoinColumn(name = "nguoi_duyet_id")
    private User nguoiDuyet;

    @Column(name = "ngay_duyet")
    private LocalDateTime ngayDuyet;

    @Column(name = "ghi_chu_duyet", length = 500, columnDefinition = "NVARCHAR(500)")
    private String ghiChuDuyet;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        calculateDays();
    }

    @PreUpdate
    protected void onUpdate() {
        calculateDays();
    }

    private void calculateDays() {
        if (ngayBatDau != null && ngayKetThuc != null) {
            long days = java.time.temporal.ChronoUnit.DAYS.between(ngayBatDau, ngayKetThuc) + 1;
            this.soNgay = (int) days;
        }
    }

    /**
     * PM approve (Step 1)
     */
    public void approvePM(User pmUser, String note) {
        this.pmApprover = pmUser;
        this.pmApprovedAt = LocalDateTime.now();
        this.pmNote = note;
        // Chưa chuyển trạng thái, chờ Accounting approve
        this.trangThai = TrangThaiNghiPhep.PM_APPROVED;
    }
    
    /**
     * Accounting approve (Step 2 - final)
     */
    public void approveAccounting(User accountingUser, String note) {
        this.accountingApprover = accountingUser;
        this.accountingApprovedAt = LocalDateTime.now();
        this.accountingNote = note;
        // Chỉ chuyển sang DA_DUYET khi cả PM và Accounting đều approve
        if (this.pmApprover != null) {
            this.trangThai = TrangThaiNghiPhep.DA_DUYET;
            // Set legacy fields
            this.nguoiDuyet = accountingUser;
            this.ngayDuyet = LocalDateTime.now();
            this.ghiChuDuyet = "PM: " + (pmNote != null ? pmNote : "OK") + " | ACC: " + note;
        }
    }
    
    /**
     * Legacy approve method (backward compatibility)
     */
    public void approve(User approver, String note) {
        this.trangThai = TrangThaiNghiPhep.DA_DUYET;
        this.nguoiDuyet = approver;
        this.ngayDuyet = LocalDateTime.now();
        this.ghiChuDuyet = note;
    }

    public void reject(User approver, String note) {
        this.trangThai = TrangThaiNghiPhep.TU_CHOI;
        this.nguoiDuyet = approver;
        this.ngayDuyet = LocalDateTime.now();
        this.ghiChuDuyet = note;
    }

    public boolean isPending() {
        return trangThai == TrangThaiNghiPhep.CHO_DUYET;
    }
    
    public boolean isPMApproved() {
        return trangThai == TrangThaiNghiPhep.PM_APPROVED;
    }

    public boolean isApproved() {
        return trangThai == TrangThaiNghiPhep.DA_DUYET;
    }

    public boolean isRejected() {
        return trangThai == TrangThaiNghiPhep.TU_CHOI;
    }

    public enum LoaiPhep {
        PHEP_NAM,
        OM,
        KO_LUONG,
        KHAC
    }

    public enum TrangThaiNghiPhep {
        CHO_DUYET,          // Chờ PM duyệt
        PM_APPROVED,        // PM đã duyệt, chờ Accounting
        DA_DUYET,           // Cả PM và Accounting đều approved
        TU_CHOI             // Bị từ chối (PM hoặc Accounting)
    }
}
