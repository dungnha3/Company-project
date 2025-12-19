package DoAn.BE.notification.dto;

import DoAn.BE.notification.entity.ThongBao.LoaiThongBao;
import DoAn.BE.notification.entity.ThongBao.MucDoUuTien;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// DTO cho request tạo thông báo mới
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateThongBaoRequest {
    
    @NotNull(message = "Loại thông báo không được để trống")
    private LoaiThongBao loai;
    
    @NotBlank(message = "Tiêu đề không được để trống")
    private String tieuDe;
    
    @NotBlank(message = "Nội dung không được để trống")
    private String noiDung;
    
    @NotNull(message = "Người nhận không được để trống")
    private Long nguoiNhanId;
    
    private String urlLienKet;
    private String metadata;
    private MucDoUuTien uuTien = MucDoUuTien.BINH_THUONG;
    private Boolean guiEmail = false;
}
