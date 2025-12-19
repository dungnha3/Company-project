package DoAn.BE.hr.mapper;

import DoAn.BE.hr.dto.ChucVuDTO;
import DoAn.BE.hr.entity.ChucVu;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class ChucVuMapper {
    
    public ChucVuDTO toDTO(ChucVu chucVu) {
        if (chucVu == null) {
            return null;
        }
        
        ChucVuDTO dto = new ChucVuDTO();
        dto.setChucvuId(chucVu.getChucvuId());
        dto.setTenChucVu(chucVu.getTenChucVu());
        dto.setMoTa(chucVu.getMoTa());
        dto.setIcon(chucVu.getIcon());
        dto.setHeSoLuong(chucVu.getHeSoLuong());
        dto.setLevel(chucVu.getLevel());
        dto.setCreatedAt(chucVu.getCreatedAt());
        
        // Safely handle lazy-loaded collection
        try {
            if (chucVu.getNhanViens() != null) {
                dto.setSoLuongNhanVien(chucVu.getNhanViens().size());
            }
        } catch (Exception e) {
            // LazyInitializationException - collection not loaded
            dto.setSoLuongNhanVien(0);
        }
        
        return dto;
    }
    
    public List<ChucVuDTO> toDTOList(List<ChucVu> chucVus) {
        if (chucVus == null) {
            return null;
        }
        return chucVus.stream().map(this::toDTO).collect(Collectors.toList());
    }
}
