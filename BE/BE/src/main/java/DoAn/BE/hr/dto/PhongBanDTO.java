package DoAn.BE.hr.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PhongBanDTO {
    private Long phongbanId;
    private String tenPhongBan;
    private String moTa;
    private Long truongPhongId;
    private String tenTruongPhong;
    private LocalDateTime createdAt;
    private Integer soLuongNhanVien;
}
