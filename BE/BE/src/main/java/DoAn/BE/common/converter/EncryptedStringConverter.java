package DoAn.BE.common.converter;

import DoAn.BE.common.service.EncryptionService;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * JPA AttributeConverter for automatic field-level encryption
 * 
 * Usage:
 * 
 * @Column(name = "ssn")
 * @Convert(converter = EncryptedStringConverter.class)
 *                    private String ssn;
 */
@Converter
@Component
public class EncryptedStringConverter implements AttributeConverter<String, String> {

    private static EncryptionService encryptionService;

    @Autowired
    public void setEncryptionService(EncryptionService service) {
        EncryptedStringConverter.encryptionService = service;
    }

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null || attribute.isEmpty()) {
            return attribute;
        }

        // Avoid double encryption
        if (encryptionService.isEncrypted(attribute)) {
            return attribute;
        }

        return encryptionService.encrypt(attribute);
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isEmpty()) {
            return dbData;
        }

        // Only decrypt if it looks encrypted
        if (!encryptionService.isEncrypted(dbData)) {
            return dbData;
        }

        return encryptionService.decrypt(dbData);
    }
}
