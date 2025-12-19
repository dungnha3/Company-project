package DoAn.BE.hr.converter;

import DoAn.BE.hr.entity.NhanVien.GioiTinh;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.extern.slf4j.Slf4j;

/**
 * Custom converter for GioiTinh enum to handle corrupted database values
 * caused by character encoding issues
 */
@Converter(autoApply = true)
@Slf4j
public class GioiTinhConverter implements AttributeConverter<GioiTinh, String> {

    @Override
    public String convertToDatabaseColumn(GioiTinh attribute) {
        if (attribute == null) {
            return null;
        }
        return attribute.name();
    }

    @Override
    public GioiTinh convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.trim().isEmpty()) {
            return null;
        }

        try {
            // Try to match the exact enum name first
            return GioiTinh.valueOf(dbData);
        } catch (IllegalArgumentException e) {
            // Handle corrupted values
            log.warn("⚠️ Corrupted GioiTinh value in database: '{}'. Attempting to fix...", dbData);
            
            // Try to match by prefix (handle corrupted Vietnamese characters)
            if (dbData.startsWith("N") && dbData.length() <= 3) {
                // Likely corrupted "Nữ"
                log.warn("Converting corrupted value '{}' to 'Nữ'", dbData);
                return GioiTinh.Nữ;
            } else if (dbData.equalsIgnoreCase("Nam")) {
                return GioiTinh.Nam;
            } else if (dbData.equalsIgnoreCase("Khac") || dbData.startsWith("Kh")) {
                return GioiTinh.Khác;
            }
            
            // Default fallback
            log.error("❌ Could not convert corrupted GioiTinh value: '{}'. Using default: Nam", dbData);
            return GioiTinh.Nam;
        }
    }
}
