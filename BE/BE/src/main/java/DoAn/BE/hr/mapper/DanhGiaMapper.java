package DoAn.BE.hr.mapper;

import DoAn.BE.hr.dto.DanhGiaDTO;
import DoAn.BE.hr.entity.DanhGia;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DanhGiaMapper {

    public DanhGiaDTO toDTO(DanhGia danhGia) {
        if (danhGia == null) {
            return null;
        }

        DanhGiaDTO dto = new DanhGiaDTO();
        dto.setDanhGiaId(danhGia.getDanhGiaId());
        dto.setKyDanhGia(danhGia.getKyDanhGia());
        dto.setLoaiDanhGia(danhGia.getLoaiDanhGia());

        // Thông tin điểm số
        dto.setDiemChuyenMon(danhGia.getDiemChuyenMon());
        dto.setDiemThaiDo(danhGia.getDiemThaiDo());
        dto.setDiemKyNangMem(danhGia.getDiemKyNangMem());
        dto.setDiemDongDoi(danhGia.getDiemDongDoi());
        dto.setDiemTong(danhGia.getDiemTong());
        dto.setXepLoai(danhGia.getXepLoai());

        // Thông tin đánh giá
        dto.setNhanXet(danhGia.getNhanXet());
        dto.setMucTieuTiepTheo(danhGia.getMucTieuTiepTheo());
        dto.setKeHoachPhatTrien(danhGia.getKeHoachPhatTrien());

        // Trạng thái và thời gian
        dto.setTrangThai(danhGia.getTrangThai());
        dto.setNgayBatDau(danhGia.getNgayBatDau());
        dto.setNgayKetThuc(danhGia.getNgayKetThuc());
        dto.setNgayHoanThanh(danhGia.getNgayHoanThanh());
        dto.setCreatedAt(danhGia.getCreatedAt());
        dto.setUpdatedAt(danhGia.getUpdatedAt());

        // Thông tin nhân viên được đánh giá
        if (danhGia.getNhanVien() != null) {
            dto.setNhanvienId(danhGia.getNhanVien().getNhanvienId());
            dto.setTenNhanVien(danhGia.getNhanVien().getHoTen());

            if (danhGia.getNhanVien().getUser() != null) {
                dto.setEmailNhanVien(danhGia.getNhanVien().getUser().getEmail());
                dto.setAvatar(danhGia.getNhanVien().getUser().getAvatarUrl());
            }

            if (danhGia.getNhanVien().getPhongBan() != null) {
                dto.setPhongBan(danhGia.getNhanVien().getPhongBan().getTenPhongBan());
            }

            if (danhGia.getNhanVien().getChucVu() != null) {
                dto.setChucVu(danhGia.getNhanVien().getChucVu().getTenChucVu());
            }
        }

        // Thông tin người đánh giá
        if (danhGia.getNguoiDanhGia() != null) {
            dto.setNguoiDanhGiaId(danhGia.getNguoiDanhGia().getNhanvienId());
            dto.setTenNguoiDanhGia(danhGia.getNguoiDanhGia().getHoTen());
        }

        return dto;
    }

    public List<DanhGiaDTO> toDTOList(List<DanhGia> danhGias) {
        return danhGias.stream()
                .map(this::toDTO)
                .toList();
    }
}
