package DoAn.BE.hr.mapper;

import DoAn.BE.hr.dto.ChamCongDTO;
import DoAn.BE.hr.entity.ChamCong;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class ChamCongMapper {

    /**
     * Convert ChamCong entity to ChamCongDTO
     */
    public ChamCongDTO toDTO(ChamCong chamCong) {
        if (chamCong == null) {
            return null;
        }

        ChamCongDTO dto = new ChamCongDTO();
        dto.setChamcongId(chamCong.getChamcongId());

        // Thông tin nhân viên
        if (chamCong.getNhanVien() != null) {
            dto.setNhanvienId(chamCong.getNhanVien().getNhanvienId());
            dto.setHoTenNhanVien(chamCong.getNhanVien().getHoTen());

            if (chamCong.getNhanVien().getPhongBan() != null) {
                dto.setPhongBan(chamCong.getNhanVien().getPhongBan().getTenPhongBan());
            }

            if (chamCong.getNhanVien().getUser() != null) {
                dto.setAvatarUrl(chamCong.getNhanVien().getUser().getAvatarUrl());
            }
        }

        // Thông tin chấm công
        dto.setNgayCham(chamCong.getNgayCham());
        dto.setGioVao(chamCong.getGioVao());
        dto.setGioRa(chamCong.getGioRa());
        dto.setSoGioLam(chamCong.getSoGioLam());
        dto.setTrangThai(chamCong.getTrangThai());
        dto.setGhiChu(chamCong.getGhiChu());
        dto.setCreatedAt(chamCong.getCreatedAt());

        // Computed fields
        dto.setIsLate(chamCong.isLate());
        dto.setIsEarlyLeave(chamCong.isEarlyLeave());

        return dto;
    }

    /**
     * Convert list of ChamCong entities to list of ChamCongDTOs
     */
    public List<ChamCongDTO> toDTOList(List<ChamCong> chamCongs) {
        if (chamCongs == null) {
            return null;
        }

        return chamCongs.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }
}
