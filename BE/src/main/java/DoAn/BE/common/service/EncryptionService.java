package DoAn.BE.common.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

// Service for AES-256-GCM encryption/decryption of sensitive data
// Used for data encryption at rest
// /
@Service
@Slf4j
public class EncryptionService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12; // 96 bits
    private static final int GCM_TAG_LENGTH = 128; // 128 bits

    private final SecretKey secretKey;
    private final SecureRandom secureRandom = new SecureRandom();

    public EncryptionService(
            @Value("${app.encryption.key:}") String encryptionKey) {
        if (encryptionKey == null || encryptionKey.isBlank()) {
            throw new IllegalStateException(
                    "app.encryption.key is NOT configured! Set it in application.properties or environment variables. "
                            + "Generate a key with: EncryptionService.generateKey()");
        }
        byte[] keyBytes = ensureKeyLength(encryptionKey);
        this.secretKey = new SecretKeySpec(keyBytes, "AES");
        log.info("EncryptionService initialized with AES-256-GCM");
    }

    // Encrypt plaintext to Base64-encoded ciphertext
    // Format: [IV (12 bytes)][Ciphertext + Auth Tag]
    // /
    public String encrypt(String plaintext) {
        if (plaintext == null || plaintext.isEmpty()) {
            return plaintext;
        }

        try {
            // Generate random IV
            byte[] iv = new byte[GCM_IV_LENGTH];
            secureRandom.nextBytes(iv);

            // Initialize cipher
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, parameterSpec);

            // Encrypt
            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

            // Combine IV + ciphertext
            ByteBuffer byteBuffer = ByteBuffer.allocate(iv.length + ciphertext.length);
            byteBuffer.put(iv);
            byteBuffer.put(ciphertext);

            return Base64.getEncoder().encodeToString(byteBuffer.array());

        } catch (Exception e) {
            log.error("Encryption failed: {}", e.getMessage());
            throw new RuntimeException("Encryption failed", e);
        }
    }

    // Decrypt Base64-encoded ciphertext to plaintext
    // /
    public String decrypt(String ciphertext) {
        if (ciphertext == null || ciphertext.isEmpty()) {
            return ciphertext;
        }

        try {
            byte[] decoded = Base64.getDecoder().decode(ciphertext);

            // Extract IV
            ByteBuffer byteBuffer = ByteBuffer.wrap(decoded);
            byte[] iv = new byte[GCM_IV_LENGTH];
            byteBuffer.get(iv);

            // Extract ciphertext
            byte[] encryptedData = new byte[byteBuffer.remaining()];
            byteBuffer.get(encryptedData);

            // Initialize cipher
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, parameterSpec);

            // Decrypt
            byte[] plaintext = cipher.doFinal(encryptedData);
            return new String(plaintext, StandardCharsets.UTF_8);

        } catch (Exception e) {
            log.error("Decryption failed: {}", e.getMessage());
            throw new RuntimeException("Decryption failed", e);
        }
    }

    // Check if a string appears to be encrypted (Base64 encoded with proper length)
    // /
    // data = 29
    // This dramatically reduces false positives on random Base64 strings
    public boolean isEncrypted(String value) {
        if (value == null || value.length() < 40) { // Base64 of 29 bytes = ~40 chars
            return false;
        }
        try {
            byte[] decoded = Base64.getDecoder().decode(value);
            // Minimum: 12 (IV) + 16 (GCM auth tag) + 1 (data) = 29 bytes
            return decoded.length >= GCM_IV_LENGTH + (GCM_TAG_LENGTH / 8) + 1;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    // Ensure encryption key is exactly 32 bytes
    // /
    private byte[] ensureKeyLength(String key) {
        byte[] keyBytes = key.getBytes(StandardCharsets.UTF_8);
        byte[] result = new byte[32];

        if (keyBytes.length >= 32) {
            System.arraycopy(keyBytes, 0, result, 0, 32);
        } else {
            log.warn("Encryption key is only {} bytes (expected 32). Key will be zero-padded, reducing security. "
                    + "Please use a full 32-byte key.", keyBytes.length);
            System.arraycopy(keyBytes, 0, result, 0, keyBytes.length);
        }

        return result;
    }

    // Generate a new random encryption key (Base64 encoded)
    public static String generateKey() {
        byte[] key = new byte[32];
        new SecureRandom().nextBytes(key);
        return Base64.getEncoder().encodeToString(key);
    }
}
