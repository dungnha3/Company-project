package DoAn.BE.company.entity;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

// Converter để chuyển đổi UserPermissions ↔ JSON String cho database
@Converter(autoApply = false)
public class UserPermissionsConverter implements AttributeConverter<UserPermissions, String> {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(UserPermissions attribute) {
        if (attribute == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(attribute);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Lỗi serialize UserPermissions", e);
        }
    }

    @Override
    public UserPermissions convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isEmpty()) {
            return new UserPermissions();
        }
        try {
            return objectMapper.readValue(dbData, UserPermissions.class);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Lỗi deserialize UserPermissions", e);
        }
    }
}
