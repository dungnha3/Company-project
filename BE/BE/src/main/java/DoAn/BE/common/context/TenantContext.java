package DoAn.BE.common.context;

/**
 * Thread-local storage cho workspace context trong multi-tenant system
 * 
 * Dual Mode:
 * - COMPANY mode: companyId set, query by company_id
 * - PERSONAL mode: personalMode=true, userId set, query by user_id
 */
public class TenantContext {

    private static final ThreadLocal<Long> currentCompanyId = new ThreadLocal<>();
    private static final ThreadLocal<Boolean> personalMode = new ThreadLocal<>();
    private static final ThreadLocal<Long> currentUserId = new ThreadLocal<>();

    // ==================== COMPANY MODE ====================

    public static void setCompanyId(Long companyId) {
        currentCompanyId.set(companyId);
        personalMode.set(false);
    }

    public static Long getCompanyId() {
        return currentCompanyId.get();
    }

    // ==================== PERSONAL MODE ====================

    public static void setPersonalMode(boolean value) {
        personalMode.set(value);
    }

    public static boolean isPersonalMode() {
        return Boolean.TRUE.equals(personalMode.get());
    }

    public static void setCurrentUserId(Long userId) {
        currentUserId.set(userId);
    }

    public static Long getCurrentUserId() {
        return currentUserId.get();
    }

    // ==================== HELPERS ====================

    public static boolean hasCompanyContext() {
        return currentCompanyId.get() != null;
    }

    public static boolean hasAnyContext() {
        return hasCompanyContext() || isPersonalMode();
    }

    // Xóa context sau khi xử lý xong request
    public static void clear() {
        currentCompanyId.remove();
        personalMode.remove();
        currentUserId.remove();
    }
}
