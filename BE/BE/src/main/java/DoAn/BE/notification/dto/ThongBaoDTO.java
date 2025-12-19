package DoAn.BE.notification.dto;

import DoAn.BE.notification.entity.ThongBao.LoaiThongBao;
import DoAn.BE.notification.entity.ThongBao.TrangThaiThongBao;
import DoAn.BE.notification.entity.ThongBao.MucDoUuTien;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

// DTO cho response thông báo (không expose entity trực tiếp)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ThongBaoDTO {
    
    private Long thongbaoId;
    private LoaiThongBao loai;
    private String tieuDe;
    private String noiDung;
    private Long nguoiNhanId;
    private String nguoiNhanUsername;
    private Long nguoiGuiId;
    private String nguoiGuiUsername;
    private TrangThaiThongBao trangThai;
    private LocalDateTime ngayTao;
    private LocalDateTime ngayDoc;
    private String urlLienKet;
    private String metadata;
    private MucDoUuTien uuTien;
    private Boolean guiEmail;
    private LocalDateTime ngayGuiEmail;
}
