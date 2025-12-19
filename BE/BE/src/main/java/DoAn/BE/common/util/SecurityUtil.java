package DoAn.BE.common.util;

import DoAn.BE.user.entity.User;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Utility class để làm việc với Spring Security Context
 */
public class SecurityUtil {
    
    /**
     * Lấy User object hiện tại từ SecurityContext
     * @return User object đã đăng nhập
     * @throws RuntimeException nếu user chưa được xác thực
     */
    public static User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null && authentication.isAuthenticated() && 
            authentication.getPrincipal() instanceof User) {
            return (User) authentication.getPrincipal();
        }
        
        throw new RuntimeException("User chưa được xác thực");
    }
    
    /**
     * Lấy userId của user hiện tại
     * @return userId của user đã đăng nhập
     * @throws RuntimeException nếu user chưa được xác thực
     */
    public static Long getCurrentUserId() {
        return getCurrentUser().getUserId();
    }
    
    /**
     * Kiểm tra xem user có đã đăng nhập không
     * @return true nếu user đã đăng nhập
     */
    public static boolean isAuthenticated() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.isAuthenticated() && 
               !authentication.getPrincipal().equals("anonymousUser");
    }
    
    /**
     * Lấy username của user hiện tại
     * @return username hoặc null nếu chưa đăng nhập
     */
    public static String getCurrentUsername() {
        if (!isAuthenticated()) {
            return null;
        }
        
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication.getName();
    }
}
