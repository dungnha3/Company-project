package DoAn.BE.common.service;

import org.springframework.stereotype.Service;

import DoAn.BE.company.entity.CompanyMember;
import DoAn.BE.company.entity.Plan;
import DoAn.BE.company.entity.UserPermissions;

@Service
public class PermissionService {

    private final DoAn.BE.company.service.CompanyService companyService;

    public PermissionService(
            @org.springframework.context.annotation.Lazy DoAn.BE.company.service.CompanyService companyService) {
        this.companyService = companyService;
    }

    public boolean hasPermission(CompanyMember member, String feature, String action) {
        if (member == null || member.getRoles() == null || member.getPermissions() == null) {
            return false;
        }

        // Owner/Admin luôn có quyền truy cập (Cơ chế an toàn)
        if (member.hasAnyRole(DoAn.BE.company.entity.CompanyRole.OWNER,
                DoAn.BE.company.entity.CompanyRole.COMPANY_ADMIN)) {
            // NHƯNG vẫn cần check Plan tier - Admin không thể bypass Plan limits
            if (!isPlanFeatureEnabled(member.getCompany().getPlan(), feature)) {
                return false;
            }
            return true;
        }

        // CẤP ĐỘ 0: KIỂM TRA PLAN TIER (BẮT BUỘC)
        Plan companyPlan = member.getCompany().getPlan();
        if (companyPlan == null) {
            companyPlan = Plan.FREE; // Default to FREE if null
        }
        if (!isPlanFeatureEnabled(companyPlan, feature)) {
            return false;
        }

        // CẤP ĐỘ 1: KIỂM TRA CẤU HÌNH CÔNG TY (CỜ TÍNH NĂNG)
        // Lấy cấu hình của công ty từ cache/db
        DoAn.BE.company.entity.CompanySettings settings = companyService
                .getSettingsCached(member.getCompany().getCompanyId());

        // Kiểm tra xem tính năng này có được bật cho công ty không
        if (!isFeatureEnabledForCompany(settings, feature)) {
            return false;
        }

        // CẤP ĐỘ 2: KIỂM TRA QUYỀN NGƯỜI DÙNG (CHI TIẾT)
        UserPermissions p = member.getPermissions();

        // Kiểm tra explicit permission từ DB trước
        Boolean explicitResult = checkExplicitPermission(p, feature, action);
        if (explicitResult != null && explicitResult) {
            return true;
        }

        // CẤP ĐỘ 2.5: FALLBACK — quyền mặc định theo vai trò
        // Khi admin chưa cấu hình permission cá nhân, role sẽ quyết định
        if (hasRoleBasedDefaultPermission(member, feature, action)) {
            return true;
        }

        // Nếu explicit = false (đã set rõ ràng) hoặc null (không match), từ chối
        return false;
    }

    /**
     * Kiểm tra quyền được chỉ định cụ thể trong UserPermissions.
     * Trả về null nếu không tìm thấy mapping.
     */
    private Boolean checkExplicitPermission(UserPermissions p, String feature, String action) {
        if (p == null)
            return null;

        switch (feature + "." + action) {
            // HR
            case "HR.VIEW_LIST":
                return p.isHrViewList();
            case "HR.EDIT_PROFILE":
                return p.isHrEditProfile();
            case "HR.CREATE_EMPLOYEE":
                return p.isHrCreateEmployee();
            case "HR.DELETE_EMPLOYEE":
                return p.isHrDeleteEmployee();
            case "HR.MANAGE_CONTRACTS":
                return p.isHrManageContracts();
            case "HR.MANAGE_REVIEWS":
                return p.isHrManageReviews();
            case "HR.VIEW_DEPARTMENTS":
                return p.isHrViewDepartments();
            case "HR.MANAGE_DEPARTMENTS":
                return p.isHrManageDepartments();
            case "HR.VIEW_POSITIONS":
                return p.isHrViewPositions();
            case "HR.MANAGE_POSITIONS":
                return p.isHrManagePositions();
            case "HR.VIEW_DASHBOARD":
                return p.isHrViewDashboard();
            case "HR.EXPORT":
                return p.isHrExport();
            // Contract
            case "CONTRACT.VIEW":
                return p.isContractView();
            case "CONTRACT.CREATE":
                return p.isContractCreate();
            case "CONTRACT.EDIT":
                return p.isContractEdit();
            case "CONTRACT.DELETE":
                return p.isContractDelete();
            case "CONTRACT.RENEW":
                return p.isContractRenew();
            // Salary
            case "SALARY.VIEW":
                return p.isSalaryView();
            case "SALARY.CALCULATE":
                return p.isSalaryCalculate();
            case "SALARY.APPROVE":
                return p.isSalaryApprove();
            case "SALARY.EXPORT":
                return p.isSalaryExport();
            // Leave
            case "LEAVE.APPROVE":
                return p.isLeaveApprove();
            case "LEAVE.VIEW_ALL":
                return p.isLeaveViewAll();
            // Attendance
            case "ATTENDANCE.VIEW_ALL":
                return p.isAttendanceViewAll();
            case "ATTENDANCE.EDIT":
                return p.isAttendanceEdit();
            // Review
            case "REVIEW.VIEW_ALL":
                return p.isReviewViewAll();
            case "REVIEW.CREATE":
                return p.isReviewCreate();
            case "REVIEW.APPROVE":
                return p.isReviewApprove();
            // OKR
            case "OKR.MANAGE":
                return p.isOkrManage();
            // Onboarding
            case "ONBOARDING.MANAGE":
                return p.isOnboardingManage();
            // Project
            case "PROJECT.CREATE":
                return p.isProjectCreate();
            case "PROJECT.MANAGE_ALL":
                return p.isProjectManageAll();
            case "PROJECT.DELETE":
                return p.isProjectDelete();
            case "PROJECT.MANAGE_ISSUES":
                return p.isProjectManageIssues();
            case "PROJECT.MANAGE_SPRINTS":
                return p.isProjectManageSprints();
            case "PROJECT.VIEW_DASHBOARD":
                return p.isProjectViewDashboard();
            case "PROJECT.EXPORT":
                return p.isProjectExport();
            case "PROJECT.MANAGE_PHASES":
                return p.isProjectManagePhases();
            case "PROJECT.RESOURCE_PLANNING":
                return p.isProjectResourcePlanning();
            // Time Tracking
            case "TIMETRACKING.LOG":
                return p.isTimetrackingLog();
            case "TIMETRACKING.VIEW_ALL":
                return p.isTimetrackingViewAll();
            // Analytics
            case "ANALYTICS.VIEW":
                return p.isAnalyticsView();
            // Calendar
            case "CALENDAR.VIEW":
                return p.isCalendarView();
            case "CALENDAR.MANAGE":
                return p.isCalendarManage();
            // Chat
            case "CHAT.CREATE_GROUP":
                return p.isChatCreateGroup();
            case "CHAT.SEND_MESSAGE":
                return p.isChatSendMessage();
            case "CHAT.SHARE_FILE":
                return p.isChatShareFile();
            // Storage
            case "STORAGE.UPLOAD":
                return p.isStorageUpload();
            case "STORAGE.DELETE":
                return p.isStorageDelete();
            case "STORAGE.SHARE":
                return p.isStorageShare();
            case "STORAGE.MANAGE_FOLDERS":
                return p.isStorageManageFolders();
            // AI
            case "AI.CHAT":
                return p.isAiChat();
            case "AI.CREATE_ISSUES":
                return p.isAiCreateIssues();
            default:
                return null;
        }
    }

    /**
     * Quyền mặc định theo vai trò — áp dụng khi chưa có explicit permissions.
     * OWNER/COMPANY_ADMIN: đã được xử lý ở đầu hasPermission() → luôn true
     * EMPLOYEE: xem project cá nhân, chat, calendar, storage cơ bản
     */
    private boolean hasRoleBasedDefaultPermission(CompanyMember member, String feature, String action) {
        // All roles → basic chat, calendar, storage access
        switch (feature + "." + action) {
            case "CHAT.SEND_MESSAGE":
            case "CHAT.SHARE_FILE":
            case "CALENDAR.VIEW":
            case "STORAGE.UPLOAD":
            case "STORAGE.DELETE":
            case "TIMETRACKING.LOG":
                return true;
        }

        return false;
    }

    // CẤP ĐỘ 0: Kiểm tra Plan Tier có cho phép feature không
    // Đây là cấp cao nhất - KHÔNG THỂ BYPASS
    private boolean isPlanFeatureEnabled(Plan plan, String feature) {
        if (plan == null) {
            plan = Plan.FREE;
        }

        switch (feature) {
            case "HR":
            case "SALARY":
            case "LEAVE":
            case "ATTENDANCE":
            case "CONTRACT":
            case "REVIEW":
            case "OKR":
            case "ONBOARDING":
                return plan.isHrModuleEnabled();
            case "AI":
                return plan.isAiModuleEnabled();
            case "WEBHOOK":
                return plan.isWebhookEnabled();
            case "API":
                return plan.isApiAccessEnabled();
            case "PROJECT":
            case "TIMETRACKING":
            case "ANALYTICS":
            case "CALENDAR":
            case "CHAT":
            case "STORAGE":
                return true; // Các module cơ bản luôn có
            default:
                return true;
        }
    }

    // CẤP ĐỘ 1: Kiểm tra Feature Flag của công ty (Admin có thể tắt/bật cho toàn
    // công ty)
    private boolean isFeatureEnabledForCompany(DoAn.BE.company.entity.CompanySettings settings, String feature) {
        if (settings == null) {
            return isPlanFeatureEnabled(Plan.FREE, feature);
        }

        switch (feature) {
            case "HR":
                return settings.isHrModuleEnabled();
            case "SALARY":
                return settings.isHrModuleEnabled() && settings.isSalaryEnabled();
            case "LEAVE":
                return settings.isHrModuleEnabled() && settings.isLeaveEnabled();
            case "ATTENDANCE":
                return settings.isHrModuleEnabled() && settings.isAttendanceEnabled();
            case "CONTRACT":
                return settings.isHrModuleEnabled() && settings.isContractEnabled();
            case "REVIEW":
                return settings.isHrModuleEnabled() && settings.isReviewEnabled();
            case "OKR":
                return settings.isHrModuleEnabled() && settings.isOkrEnabled();
            case "ONBOARDING":
                return settings.isHrModuleEnabled() && settings.isOnboardingEnabled();
            case "PROJECT":
                return settings.isProjectModuleEnabled();
            case "TIMETRACKING":
                return settings.isProjectModuleEnabled() && settings.isTimeTrackingEnabled();
            case "ANALYTICS":
                return settings.isProjectModuleEnabled() && settings.isAnalyticsEnabled();
            case "CALENDAR":
                return settings.isCalendarEnabled();
            case "CHAT":
                return settings.isChatModuleEnabled();
            case "STORAGE":
                return settings.isStorageModuleEnabled();
            case "AI":
                return settings.isAiModuleEnabled();
            case "WEBHOOK":
                return settings.isWebhookEnabled();
            default:
                return true;
        }
    }
}
