package DoAn.BE.hr.mapper;

import DoAn.BE.hr.dto.PhongBanDTO;
import DoAn.BE.hr.entity.PhongBan;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class PhongBanMapper {
    
    public PhongBanDTO toDTO(PhongBan phongBan) {
        if (phongBan == null) {
            return null;
        }
        
        PhongBanDTO dto = new PhongBanDTO();
        dto.setPhongbanId(phongBan.getPhongbanId());
        dto.setTenPhongBan(phongBan.getTenPhongBan());
        dto.setMoTa(phongBan.getMoTa());
        
        if (phongBan.getTruongPhong() != null) {
            dto.setTruongPhongId(phongBan.getTruongPhong().getNhanvienId());
            dto.setTenTruongPhong(phongBan.getTruongPhong().getHoTen());
        }
        
        dto.setCreatedAt(phongBan.getCreatedAt());
        
        // Safely handle lazy-loaded collection
        try {
            if (phongBan.getNhanViens() != null) {
                dto.setSoLuongNhanVien(phongBan.getNhanViens().size());
            }
        } catch (Exception e) {
            // LazyInitializationException - collection not loaded
            dto.setSoLuongNhanVien(0);
        }
        
        return dto;
    }
    
    public List<PhongBanDTO> toDTOList(List<PhongBan> phongBans) {
        if (phongBans == null) {
            return null;
        }
        return phongBans.stream().map(this::toDTO).collect(Collectors.toList());
    }
}
