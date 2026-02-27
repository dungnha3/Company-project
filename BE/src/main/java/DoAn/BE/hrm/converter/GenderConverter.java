package DoAn.BE.hrm.converter;

import DoAn.BE.hrm.entity.Employee.Gender;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.extern.slf4j.Slf4j;
@Converter(autoApply = true)
@Slf4j
public class GenderConverter implements AttributeConverter<Gender, String> {

    @Override
    public String convertToDatabaseColumn(Gender attribute) {
        if (attribute == null) {
            return null;
        }
        return attribute.name();
    }

    @Override
    public Gender convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.trim().isEmpty()) {
            return null;
        }

        try {
            // Try to match the exact enum name first
            return Gender.valueOf(dbData);
        } catch (IllegalArgumentException e) {
            // Handle corrupted values
            log.warn("⚠️ Corrupted Gender value in database: '{}'. Attempting to fix...", dbData);

            // Try to match by prefix (handle corrupted Vietnamese characters)
            if (dbData.startsWith("N") && dbData.length() <= 3) {
                // Likely corrupted "Nữ" (Female)
                log.warn("Converting corrupted value '{}' to 'FEMALE'", dbData);
                return Gender.FEMALE;
            } else if (dbData.equalsIgnoreCase("Nam")) {
                // Legacy "Nam" -> PROBABLY MALE?
                // Wait, Employee.Gender is MALE, FEMALE, OTHER.
                // Need to map Nam->MALE, Nu->FEMALE.
                return Gender.MALE;
            } else if (dbData.equalsIgnoreCase("Nu") || dbData.equalsIgnoreCase("Nữ")) {
                return Gender.FEMALE;
            } else if (dbData.equalsIgnoreCase("Khac") || dbData.startsWith("Kh")) {
                return Gender.OTHER;
            }

            // Default fallback
            log.error("❌ Could not convert corrupted Gender value: '{}'. Using default: MALE", dbData);
            return Gender.MALE;
        }
    }
}
