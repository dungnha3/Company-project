package DoAn.BE.common.service;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

// EncryptionService — pure crypto logic. No mocks needed.
// Just instantiate directly with a test key.
// /
public class EncryptionServiceTest {

    private EncryptionService encryptionService;

    @BeforeEach
    void setUp() {
        // 32-char key for AES-256
        encryptionService = new EncryptionService("TestEncryptionKey1234567890ABCDEF");
    }

    @Test
    void encrypt_ThenDecrypt_ReturnsOriginalText() {
        String original = "Hello, this is sensitive data!";

        String encrypted = encryptionService.encrypt(original);
        String decrypted = encryptionService.decrypt(encrypted);

        assertNotEquals(original, encrypted);
        assertEquals(original, decrypted);
    }

    @Test
    void encrypt_NullInput_ReturnsNull() {
        assertNull(encryptionService.encrypt(null));
    }

    @Test
    void encrypt_EmptyInput_ReturnsEmpty() {
        assertEquals("", encryptionService.encrypt(""));
    }

    @Test
    void decrypt_NullInput_ReturnsNull() {
        assertNull(encryptionService.decrypt(null));
    }

    @Test
    void decrypt_EmptyInput_ReturnsEmpty() {
        assertEquals("", encryptionService.decrypt(""));
    }

    @Test
    void isEncrypted_ValidCiphertext_ReturnsTrue() {
        String encrypted = encryptionService.encrypt("test data");
        assertTrue(encryptionService.isEncrypted(encrypted));
    }

    @Test
    void isEncrypted_PlainText_ReturnsFalse() {
        assertFalse(encryptionService.isEncrypted("just plain text"));
    }

    @Test
    void isEncrypted_NullInput_ReturnsFalse() {
        assertFalse(encryptionService.isEncrypted(null));
    }

    @Test
    void isEncrypted_ShortString_ReturnsFalse() {
        assertFalse(encryptionService.isEncrypted("short"));
    }

    @Test
    void generateKey_ReturnsBase64String() {
        String key = EncryptionService.generateKey();
        assertNotNull(key);
        assertFalse(key.isEmpty());
        // Should be valid Base64
        assertDoesNotThrow(() -> java.util.Base64.getDecoder().decode(key));
    }

    @Test
    void encrypt_DifferentInputs_ProduceDifferentOutputs() {
        String encrypted1 = encryptionService.encrypt("data1");
        String encrypted2 = encryptionService.encrypt("data2");

        assertNotEquals(encrypted1, encrypted2);
    }

    @Test
    void encrypt_SameInput_ProducesDifferentCiphertexts_DueToRandomIV() {
        String encrypted1 = encryptionService.encrypt("same data");
        String encrypted2 = encryptionService.encrypt("same data");

        // Due to random IV, same plaintext produces different ciphertext
        assertNotEquals(encrypted1, encrypted2);

        // But both decrypt to the same value
        assertEquals("same data", encryptionService.decrypt(encrypted1));
        assertEquals("same data", encryptionService.decrypt(encrypted2));
    }
}
