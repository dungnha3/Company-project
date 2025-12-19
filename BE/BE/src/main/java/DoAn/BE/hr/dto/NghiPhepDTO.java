package DoAn.BE.hr.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

import DoAn.BE.hr.entity.NghiPhep.LoaiPhep;
import DoAn.BE.hr.entity.NghiPhep.TrangThaiNghiPhep;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NghiPhepDTO {
    private Long nghiphepId;
    private Long nhanvienId;
    private String hoTenNhanVien;
    private String avatarUrl;
    private LoaiPhep loaiPhep;
    private LocalDate ngayBatDau;
    private LocalDate ngayKetThuc;
    private Integer soNgay;
    private String lyDo;
    private TrangThaiNghiPhep trangThai;

    // Thông tin duyệt
    private Long nguoiDuyetId;
    private String tenNguoiDuyet;
    private LocalDateTime ngayDuyet;
    private String ghiChuDuyet;

    private LocalDateTime createdAt;
}
