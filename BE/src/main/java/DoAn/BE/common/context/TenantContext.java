package DoAn.BE.common.context;

// Thread-local storage cho workspace context trong multi-tenant system
//
// - COMPANY mode: companyId set, query by company_id
// /
public class TenantContext {
    private static final ThreadLocal<Long> currentCompanyId = new ThreadLocal<>();

    public static void setCompanyId(Long companyId) {
        currentCompanyId.set(companyId);
    }

    public static Long getCompanyId() {
        return currentCompanyId.get();
    }



    public static boolean hasCompanyContext() {
        return currentCompanyId.get() != null;
    }

    public static boolean hasAnyContext() {
        return hasCompanyContext();
    }

    public static void clear() {
        currentCompanyId.remove();
    }
}
