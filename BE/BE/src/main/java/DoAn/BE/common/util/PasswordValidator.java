package DoAn.BE.common.util;

import java.util.regex.Pattern;

/**
 * Password Validator - Kiểm tra độ mạnh mật khẩu
 * Áp dụng best practices về bảo mật mật khẩu
 */
public class PasswordValidator {
    
    // Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt
    private static final String PASSWORD_PATTERN = 
        "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$";
    
    private static final Pattern pattern = Pattern.compile(PASSWORD_PATTERN);
    
    /**
     * Kiểm tra mật khẩu có đáp ứng yêu cầu không
     */
    public static boolean isValid(String password) {
        if (password == null || password.trim().isEmpty()) {
            return false;
        }
        return pattern.matcher(password).matches();
    }
    
    /**
     * Lấy mô tả yêu cầu mật khẩu
     */
    public static String getPasswordRequirements() {
        return "Mật khẩu phải có ít nhất 8 ký tự, bao gồm: " +
               "chữ hoa, chữ thường, số và ký tự đặc biệt (@$!%*?&)";
    }
    
    /**
     * Kiểm tra mật khẩu có phổ biến không
     */
    public static boolean isCommonPassword(String password) {
        String[] commonPasswords = {
            "password", "123456", "123456789", "12345678", "12345",
            "1234567", "admin", "password123", "admin123", "qwerty",
            "abc123", "Password1", "welcome", "monkey", "dragon",
            "letmein", "trustno1", "sunshine", "master", "123123"
        };
        
        if (password == null) {
            return false;
        }
        
        String lowerPassword = password.toLowerCase();
        for (String common : commonPasswords) {
            if (lowerPassword.equals(common.toLowerCase())) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Validate mật khẩu và trả về thông báo lỗi (nếu có)
     * @param password Mật khẩu cần validate
     * @return null nếu hợp lệ, thông báo lỗi nếu không hợp lệ
     */
    public static String validatePassword(String password) {
        if (password == null || password.trim().isEmpty()) {
            return "Mật khẩu không được để trống";
        }
        
        if (password.length() < 8) {
            return "Mật khẩu phải có ít nhất 8 ký tự";
        }
        
        if (password.length() > 128) {
            return "Mật khẩu không được quá 128 ký tự";
        }
        
        if (isCommonPassword(password)) {
            return "Mật khẩu quá phổ biến, vui lòng chọn mật khẩu khác";
        }
        
        if (!isValid(password)) {
            return getPasswordRequirements();
        }
        
        return null; // Mật khẩu hợp lệ
    }
    
    /**
     * Kiểm tra độ mạnh mật khẩu (0-4)
     * 0: Rất yếu, 1: Yếu, 2: Trung bình, 3: Mạnh, 4: Rất mạnh
     */
    public static int getPasswordStrength(String password) {
        if (password == null || password.isEmpty()) {
            return 0;
        }
        
        int strength = 0;
        
        // Độ dài
        if (password.length() >= 8) strength++;
        if (password.length() >= 12) strength++;
        
        // Có chữ thường
        if (password.matches(".*[a-z].*")) strength++;
        
        // Có chữ hoa
        if (password.matches(".*[A-Z].*")) strength++;
        
        // Có số
        if (password.matches(".*\\d.*")) strength++;
        
        // Có ký tự đặc biệt
        if (password.matches(".*[@$!%*?&].*")) strength++;
        
        // Normalize to 0-4
        return Math.min(strength / 2, 4);
    }
}
