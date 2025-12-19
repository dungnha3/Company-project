package DoAn.BE.hr.mapper;

import DoAn.BE.hr.dto.NghiPhepDTO;
import DoAn.BE.hr.entity.NghiPhep;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class NghiPhepMapper {

    /**
     * Convert NghiPhep entity to NghiPhepDTO
     */
    public NghiPhepDTO toDTO(NghiPhep nghiPhep) {
        if (nghiPhep == null) {
            return null;
        }

        NghiPhepDTO dto = new NghiPhepDTO();
        dto.setNghiphepId(nghiPhep.getNghiphepId());

        // Thông tin nhân viên
        if (nghiPhep.getNhanVien() != null) {
            dto.setNhanvienId(nghiPhep.getNhanVien().getNhanvienId());
            dto.setHoTenNhanVien(nghiPhep.getNhanVien().getHoTen());
            // Get avatar from linked User
            if (nghiPhep.getNhanVien().getUser() != null) {
                dto.setAvatarUrl(nghiPhep.getNhanVien().getUser().getAvatarUrl());
            }
        }

        // Thông tin nghỉ phép
        dto.setLoaiPhep(nghiPhep.getLoaiPhep());
        dto.setNgayBatDau(nghiPhep.getNgayBatDau());
        dto.setNgayKetThuc(nghiPhep.getNgayKetThuc());
        dto.setSoNgay(nghiPhep.getSoNgay());
        dto.setLyDo(nghiPhep.getLyDo());
        dto.setTrangThai(nghiPhep.getTrangThai());

        // Thông tin duyệt
        if (nghiPhep.getNguoiDuyet() != null) {
            dto.setNguoiDuyetId(nghiPhep.getNguoiDuyet().getUserId());
            dto.setTenNguoiDuyet(nghiPhep.getNguoiDuyet().getUsername());
        }
        dto.setNgayDuyet(nghiPhep.getNgayDuyet());
        dto.setGhiChuDuyet(nghiPhep.getGhiChuDuyet());

        dto.setCreatedAt(nghiPhep.getCreatedAt());

        return dto;
    }

    /**
     * Convert list of NghiPhep entities to list of NghiPhepDTOs
     */
    public List<NghiPhepDTO> toDTOList(List<NghiPhep> nghiPheps) {
        if (nghiPheps == null) {
            return null;
        }

        return nghiPheps.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }
}
