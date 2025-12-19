package DoAn.BE.notification.entity;

import DoAn.BE.user.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "thong_bao")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ThongBao {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long thongbaoId;
    
    @Column(nullable = false, columnDefinition = "NVARCHAR(50)")
    @Enumerated(EnumType.STRING)
    private LoaiThongBao loai;
    
    @Column(nullable = false, columnDefinition = "NVARCHAR(255)")
    private String tieuDe;
    
    @Column(nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String noiDung;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "nguoi_nhan_id", nullable = false)
    private User nguoiNhan;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "nguoi_gui_id")
    private User nguoiGui;
    
    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private TrangThaiThongBao trangThai = TrangThaiThongBao.CHUA_DOC;
    
    @Column(name = "ngay_tao", nullable = false)
    private LocalDateTime ngayTao;
    
    @Column(name = "ngay_doc")
    private LocalDateTime ngayDoc;
    
    @Column(name = "url_lien_ket", columnDefinition = "NVARCHAR(500)")
    private String urlLienKet;
    
    @Column(name = "metadata", columnDefinition = "NVARCHAR(MAX)")
    private String metadata; // Dữ liệu JSON bổ sung
    
    @Column(name = "uu_tien")
    @Enumerated(EnumType.STRING)
    private MucDoUuTien uuTien = MucDoUuTien.BINH_THUONG;
    
    @Column(name = "gui_email")
    private Boolean guiEmail = false;
    
    @Column(name = "ngay_gui_email")
    private LocalDateTime ngayGuiEmail;
    
    @PrePersist
    protected void onCreate() {
        ngayTao = LocalDateTime.now();
    }
    
    // Đánh dấu đã đọc
    public void markAsRead() {
        this.trangThai = TrangThaiThongBao.DA_DOC;
        this.ngayDoc = LocalDateTime.now();
    }
    
    public enum LoaiThongBao {
        HOP_DONG_HET_HAN,           // Hợp đồng sắp hết hạn
        NGHI_PHEP_CHO_DUYET,        // Đơn nghỉ phép cần duyệt
        NGHI_PHEP_DA_DUYET,         // Đơn nghỉ phép đã được duyệt
        NGHI_PHEP_TU_CHOI,          // Đơn nghỉ phép bị từ chối
        LUONG_DA_DUYET,             // Lương đã được duyệt
        LUONG_DA_THANH_TOAN,        // Lương đã được thanh toán
        DE_XUAT_TANG_LUONG,         // Đề xuất tăng lương
        ROLE_CHANGE_REQUEST,        // Yêu cầu thay đổi quyền
        ROLE_CHANGED,               // Quyền đã được thay đổi
        CHAM_CONG_CANH_BAO,         // Cảnh báo chấm công
        DANH_GIA_NHAN_VIEN,         // Đánh giá nhân viên
        SINH_NHAT,                  // Sinh nhật nhân viên
        WELCOME_NEW_EMPLOYEE,       // Chào mừng nhân viên mới
        SYSTEM_MAINTENANCE,         // Bảo trì hệ thống
        CHAT_MESSAGE,               // Tin nhắn chat
        PROJECT_ASSIGNED,           // Được giao dự án
        PROJECT_DEADLINE,           // Deadline dự án
        GENERAL                     // Thông báo chung
    }
    
    public enum TrangThaiThongBao {
        CHUA_DOC,
        DA_DOC,
        DA_XOA
    }
    
    public enum MucDoUuTien {
        THAP,
        BINH_THUONG,
        CAO,
        KHAN_CAP
    }
}
