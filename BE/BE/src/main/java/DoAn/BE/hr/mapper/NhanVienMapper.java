package DoAn.BE.hr.mapper;

import DoAn.BE.hr.dto.NhanVienDTO;
import DoAn.BE.hr.entity.NhanVien;
import DoAn.BE.user.entity.User;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class NhanVienMapper {

    /**
     * Convert NhanVien to DTO - CHỈ HIỂN THỊ LƯƠNG CHO ACCOUNTING
     * HR sẽ thấy null cho các trường lương
     */
    public NhanVienDTO toDTO(NhanVien nhanVien, User currentUser) {
        if (nhanVien == null) {
            return null;
        }

        NhanVienDTO dto = new NhanVienDTO();
        dto.setNhanvienId(nhanVien.getNhanvienId());

        if (nhanVien.getUser() != null) {
            dto.setUserId(nhanVien.getUser().getUserId());
            dto.setUsername(nhanVien.getUser().getUsername());
            dto.setEmail(nhanVien.getUser().getEmail());
            dto.setAvatarUrl(nhanVien.getUser().getAvatarUrl());
        }

        // Get phone number from NhanVien entity, not User
        dto.setSdt(nhanVien.getSdt());

        dto.setHoTen(nhanVien.getHoTen());
        dto.setCccd(nhanVien.getCccd());
        dto.setNgaySinh(nhanVien.getNgaySinh());
        dto.setGioiTinh(nhanVien.getGioiTinh());
        dto.setDiaChi(nhanVien.getDiaChi());
        dto.setNgayVaoLam(nhanVien.getNgayVaoLam());
        dto.setTrangThai(nhanVien.getTrangThai());

        if (nhanVien.getPhongBan() != null) {
            dto.setPhongbanId(nhanVien.getPhongBan().getPhongbanId());
            dto.setTenPhongBan(nhanVien.getPhongBan().getTenPhongBan());
        }

        if (nhanVien.getChucVu() != null) {
            dto.setChucvuId(nhanVien.getChucVu().getChucvuId());
            dto.setTenChucVu(nhanVien.getChucVu().getTenChucVu());
        }

        // 🔒 BẢO MẬT: CHỈ Accounting và chính chủ xem được lương
        if (currentUser != null &&
                (currentUser.isManagerAccounting() ||
                        (nhanVien.getUser() != null
                                && nhanVien.getUser().getUserId().equals(currentUser.getUserId())))) {
            dto.setLuongCoBan(nhanVien.getLuongCoBan());
            dto.setPhuCap(nhanVien.getPhuCap());
        } else {
            // HR/Admin/Others thấy null
            dto.setLuongCoBan(null);
            dto.setPhuCap(null);
        }

        dto.setCreatedAt(nhanVien.getCreatedAt());

        return dto;
    }

    /**
     * Legacy method - hide salary by default
     */
    public NhanVienDTO toDTO(NhanVien nhanVien) {
        return toDTO(nhanVien, null);
    }

    /**
     * Convert list with salary masking
     */
    public List<NhanVienDTO> toDTOList(List<NhanVien> nhanViens, User currentUser) {
        if (nhanViens == null) {
            return null;
        }
        return nhanViens.stream()
                .map(nv -> toDTO(nv, currentUser))
                .collect(Collectors.toList());
    }

    /**
     * Legacy method - hide salary by default
     */
    public List<NhanVienDTO> toDTOList(List<NhanVien> nhanViens) {
        return toDTOList(nhanViens, null);
    }
}
