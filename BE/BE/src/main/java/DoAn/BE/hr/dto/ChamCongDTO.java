package DoAn.BE.hr.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import DoAn.BE.hr.entity.ChamCong.TrangThaiChamCong;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChamCongDTO {
    private Long chamcongId;
    private Long nhanvienId;
    private String hoTenNhanVien;
    private LocalDate ngayCham;
    private LocalTime gioVao;
    private LocalTime gioRa;
    private BigDecimal soGioLam;
    private TrangThaiChamCong trangThai;
    private String ghiChu;
    private LocalDateTime createdAt;

    // New fields for UI display
    private String phongBan;
    private String avatarUrl;

    // Computed fields
    private Boolean isLate;
    private Boolean isEarlyLeave;
}
