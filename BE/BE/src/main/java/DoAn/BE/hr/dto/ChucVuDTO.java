package DoAn.BE.hr.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChucVuDTO {
    private Long chucvuId;
    private String tenChucVu;
    private String moTa;
    private String icon;
    private Double heSoLuong;
    private Integer level;
    private LocalDateTime createdAt;
    private Integer soLuongNhanVien;
}
