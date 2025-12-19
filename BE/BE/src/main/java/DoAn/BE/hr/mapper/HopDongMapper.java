package DoAn.BE.hr.mapper;

import DoAn.BE.hr.dto.HopDongDTO;
import DoAn.BE.hr.entity.HopDong;
import DoAn.BE.user.entity.User;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class HopDongMapper {

    /**
     * Convert HopDong entity to HopDongDTO - CHỈ HIỂN THỊ LƯƠNG CHO ACCOUNTING VÀ
     * CHÍNH CHỦ
     */
    public HopDongDTO toDTO(HopDong hopDong, User currentUser) {
        if (hopDong == null) {
            return null;
        }

        HopDongDTO dto = new HopDongDTO();
        dto.setHopdongId(hopDong.getHopdongId());

        // Thông tin nhân viên
        if (hopDong.getNhanVien() != null) {
            dto.setNhanvienId(hopDong.getNhanVien().getNhanvienId());
            dto.setHoTenNhanVien(hopDong.getNhanVien().getHoTen());
            if (hopDong.getNhanVien().getChucVu() != null) {
                dto.setTenChucVu(hopDong.getNhanVien().getChucVu().getTenChucVu());
            }
            // Get avatar from linked User
            if (hopDong.getNhanVien().getUser() != null) {
                dto.setAvatarUrl(hopDong.getNhanVien().getUser().getAvatarUrl());
            }
        }

        // Thông tin hợp đồng
        dto.setLoaiHopDong(hopDong.getLoaiHopDong());
        dto.setNgayBatDau(hopDong.getNgayBatDau());
        dto.setNgayKetThuc(hopDong.getNgayKetThuc());

        // 🔒 BẢO MẬT: CHỈ Accounting và chính chủ xem được lương
        if (currentUser != null &&
                (currentUser.isManagerAccounting() || isOwner(hopDong, currentUser))) {
            dto.setLuongCoBan(hopDong.getLuongCoBan());
        } else {
            // HR/Admin/Others thấy null
            dto.setLuongCoBan(null);
        }

        dto.setNoiDung(hopDong.getNoiDung());
        dto.setTrangThai(hopDong.getTrangThai());
        dto.setCreatedAt(hopDong.getCreatedAt());

        // Computed fields
        dto.setIsExpired(hopDong.isExpired());

        // Tính số ngày còn lại
        if (hopDong.getNgayKetThuc() != null) {
            long daysRemaining = ChronoUnit.DAYS.between(LocalDate.now(), hopDong.getNgayKetThuc());
            dto.setSoNgayConLai(daysRemaining > 0 ? (int) daysRemaining : 0);
        }

        return dto;
    }

    /**
     * Legacy method - hide salary by default
     */
    public HopDongDTO toDTO(HopDong hopDong) {
        return toDTO(hopDong, null);
    }

    /**
     * Check if currentUser is the owner of the contract
     */
    private boolean isOwner(HopDong hopDong, User currentUser) {
        return hopDong.getNhanVien() != null &&
                hopDong.getNhanVien().getUser() != null &&
                hopDong.getNhanVien().getUser().getUserId().equals(currentUser.getUserId());
    }

    /**
     * Convert list of HopDong entities to list of HopDongDTOs
     */
    public List<HopDongDTO> toDTOList(List<HopDong> hopDongs, User currentUser) {
        if (hopDongs == null) {
            return null;
        }

        return hopDongs.stream()
                .map(hd -> toDTO(hd, currentUser))
                .collect(Collectors.toList());
    }

    /**
     * Legacy method - hide salary by default
     */
    public List<HopDongDTO> toDTOList(List<HopDong> hopDongs) {
        return toDTOList(hopDongs, null);
    }
}
