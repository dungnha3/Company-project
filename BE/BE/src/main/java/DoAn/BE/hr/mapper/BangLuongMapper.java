package DoAn.BE.hr.mapper;

import DoAn.BE.hr.dto.BangLuongDTO;
import DoAn.BE.hr.entity.BangLuong;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class BangLuongMapper {
    
    /**
     * Convert BangLuong entity to BangLuongDTO
     */
    public BangLuongDTO toDTO(BangLuong bangLuong) {
        if (bangLuong == null) {
            return null;
        }
        
        BangLuongDTO dto = new BangLuongDTO();
        dto.setBangluongId(bangLuong.getBangluongId());
        
        // Thông tin nhân viên
        if (bangLuong.getNhanVien() != null) {
            dto.setNhanvienId(bangLuong.getNhanVien().getNhanvienId());
            dto.setHoTenNhanVien(bangLuong.getNhanVien().getHoTen());
        }
        
        // Thông tin kỳ lương
        dto.setThang(bangLuong.getThang());
        dto.setNam(bangLuong.getNam());
        dto.setPeriod(bangLuong.getPeriod());
        
        // Các khoản thu nhập
        dto.setLuongCoBan(bangLuong.getLuongCoBan());
        dto.setNgayCong(bangLuong.getNgayCong());
        dto.setNgayCongChuan(bangLuong.getNgayCongChuan());
        dto.setLuongTheoNgayCong(bangLuong.getLuongTheoNgayCong());
        dto.setPhuCap(bangLuong.getPhuCap());
        dto.setThuong(bangLuong.getThuong());
        dto.setGioLamThem(bangLuong.getGioLamThem());
        dto.setTienLamThem(bangLuong.getTienLamThem());
        
        // Các khoản khấu trừ
        dto.setBhxh(bangLuong.getBhxh());
        dto.setBhyt(bangLuong.getBhyt());
        dto.setBhtn(bangLuong.getBhtn());
        dto.setThueTNCN(bangLuong.getThueTNCN());
        dto.setKhauTruKhac(bangLuong.getKhauTruKhac());
        
        // Tổng kết
        dto.setTongLuong(bangLuong.getTongLuong());
        dto.setTongKhauTru(bangLuong.getTongKhauTru());
        dto.setLuongThucNhan(bangLuong.getLuongThucNhan());
        
        dto.setTrangThai(bangLuong.getTrangThai());
        dto.setGhiChu(bangLuong.getGhiChu());
        dto.setCreatedAt(bangLuong.getCreatedAt());
        
        return dto;
    }
    
    /**
     * Convert list of BangLuong entities to list of BangLuongDTOs
     */
    public List<BangLuongDTO> toDTOList(List<BangLuong> bangLuongs) {
        if (bangLuongs == null) {
            return null;
        }
        
        return bangLuongs.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }
}
