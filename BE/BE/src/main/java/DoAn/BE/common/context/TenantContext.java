package DoAn.BE.common.context;

// Thread-local storage cho company context trong multi-tenant system
public class TenantContext {

    private static final ThreadLocal<Long> currentCompanyId = new ThreadLocal<>();

    // Set company ID cho request hiện tại
    public static void setCompanyId(Long companyId) {
        currentCompanyId.set(companyId);
    }

    // Lấy company ID của request hiện tại
    public static Long getCompanyId() {
        return currentCompanyId.get();
    }

    // Xóa context sau khi xử lý xong request
    public static void clear() {
        currentCompanyId.remove();
    }
}
