package DoAn.BE.auth.service;

import DoAn.BE.common.exception.BadRequestException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
public class TwoFactorService {

    private static final String ALGORITHM = "HmacSHA1";
    private static final int CODE_DIGITS = 6;
    private static final int TIME_STEP_SECONDS = 30;
    private static final int ALLOWED_TIME_DRIFT = 1; // ±1 step (±30s)
    private static final String ISSUER = "CompanyApp";
    private static final String BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    /**
     * Generate a random Base32-encoded secret key (160 bits = 20 bytes).
     */
    public String generateSecret() {
        byte[] bytes = new byte[20];
        SECURE_RANDOM.nextBytes(bytes);
        return encodeBase32(bytes);
    }

    /**
     * Generate the otpauth:// URI for QR code scanning.
     */
    public String generateQrCodeUri(String secret, String username) {
        return String.format("otpauth://totp/%s:%s?secret=%s&issuer=%s&digits=%d&period=%d",
                ISSUER, username, secret, ISSUER, CODE_DIGITS, TIME_STEP_SECONDS);
    }

    /**
     * Verify a TOTP code against the secret, allowing ±1 time step drift.
     */
    public boolean verifyCode(String secret, String code) {
        if (secret == null || code == null || code.length() != CODE_DIGITS) {
            return false;
        }

        int inputCode;
        try {
            inputCode = Integer.parseInt(code);
        } catch (NumberFormatException e) {
            return false;
        }

        long currentTimeStep = System.currentTimeMillis() / 1000 / TIME_STEP_SECONDS;

        // Check current step and ±1 neighbors to handle clock skew
        for (int i = -ALLOWED_TIME_DRIFT; i <= ALLOWED_TIME_DRIFT; i++) {
            int generatedCode = generateCode(secret, currentTimeStep + i);
            if (generatedCode == inputCode) {
                return true;
            }
        }
        return false;
    }

    /**
     * Generate 8 one-time backup codes.
     */
    public List<String> generateBackupCodes() {
        List<String> codes = new ArrayList<>();
        for (int i = 0; i < 8; i++) {
            StringBuilder code = new StringBuilder();
            for (int j = 0; j < 8; j++) {
                code.append(SECURE_RANDOM.nextInt(10));
            }
            codes.add(code.toString());
        }
        return codes;
    }

    /**
     * Verify a backup code against the stored hashed codes.
     * Returns the remaining codes (with the used one removed) or null if invalid.
     */
    public String verifyBackupCode(String storedCodes, String inputCode) {
        if (storedCodes == null || storedCodes.isBlank() || inputCode == null) {
            return null;
        }

        String[] codes = storedCodes.split(",");
        StringBuilder remaining = new StringBuilder();
        boolean found = false;

        for (String code : codes) {
            if (!found && code.trim().equals(inputCode.trim())) {
                found = true; // Skip this code (used)
            } else {
                if (remaining.length() > 0)
                    remaining.append(",");
                remaining.append(code.trim());
            }
        }

        return found ? remaining.toString() : null;
    }

    // --- Private helpers ---

    private int generateCode(String base32Secret, long timeStep) {
        byte[] key = decodeBase32(base32Secret);
        byte[] timeBytes = ByteBuffer.allocate(8).putLong(timeStep).array();

        try {
            Mac hmac = Mac.getInstance(ALGORITHM);
            hmac.init(new SecretKeySpec(key, ALGORITHM));
            byte[] hash = hmac.doFinal(timeBytes);

            // Dynamic truncation (RFC 4226)
            int offset = hash[hash.length - 1] & 0x0F;
            int binary = ((hash[offset] & 0x7F) << 24)
                    | ((hash[offset + 1] & 0xFF) << 16)
                    | ((hash[offset + 2] & 0xFF) << 8)
                    | (hash[offset + 3] & 0xFF);

            return binary % (int) Math.pow(10, CODE_DIGITS);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new BadRequestException("Lỗi xác thực TOTP");
        }
    }

    private String encodeBase32(byte[] data) {
        StringBuilder result = new StringBuilder();
        int buffer = 0;
        int bitsLeft = 0;

        for (byte b : data) {
            buffer = (buffer << 8) | (b & 0xFF);
            bitsLeft += 8;
            while (bitsLeft >= 5) {
                bitsLeft -= 5;
                result.append(BASE32_CHARS.charAt((buffer >> bitsLeft) & 0x1F));
            }
        }
        if (bitsLeft > 0) {
            result.append(BASE32_CHARS.charAt((buffer << (5 - bitsLeft)) & 0x1F));
        }
        return result.toString();
    }

    private byte[] decodeBase32(String base32) {
        String upper = base32.toUpperCase().replaceAll("[^A-Z2-7]", "");
        int outputLength = upper.length() * 5 / 8;
        byte[] result = new byte[outputLength];

        int buffer = 0;
        int bitsLeft = 0;
        int index = 0;

        for (char c : upper.toCharArray()) {
            int val = BASE32_CHARS.indexOf(c);
            if (val < 0)
                continue;
            buffer = (buffer << 5) | val;
            bitsLeft += 5;
            if (bitsLeft >= 8) {
                bitsLeft -= 8;
                result[index++] = (byte) (buffer >> bitsLeft);
            }
        }
        return result;
    }
}
