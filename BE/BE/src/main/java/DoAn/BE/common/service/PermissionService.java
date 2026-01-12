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

    // Helper interfaces for type-safe checks (optional if we use strings)

    public boolean hasPermission(CompanyMember member, String feature, String action) {
        if (member == null || member.getRoles() == null || member.getPermissions() == null) {
            return false;
        }

        // Owner/Admin luôn có quyền truy cập (Cơ chế an toàn)
        if (member.hasAnyRole(DoAn.BE.company.entity.CompanyRole.OWNER, DoAn.BE.company.entity.CompanyRole.ADMIN)) {
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

        // Logic ánh xạ
        switch (feature + "." + action) {
            case "HR.VIEW_LIST":
                return p.isHrViewList();
            case "HR.EDIT_PROFILE":
                return p.isHrEditProfile();
            case "HR.MANAGE_CONTRACTS":
                return p.isHrManageContracts();

            case "SALARY.VIEW":
                return p.isSalaryView();
            case "SALARY.CALCULATE":
                return p.isSalaryCalculate();
            case "SALARY.APPROVE":
                return p.isSalaryApprove();

            case "LEAVE.APPROVE":
                return p.isLeaveApprove();
            case "LEAVE.VIEW_ALL":
                return p.isLeaveViewAll();

            case "ATTENDANCE.VIEW_ALL":
                return p.isAttendanceViewAll();
            case "ATTENDANCE.EDIT":
                return p.isAttendanceEdit();

            case "PROJECT.CREATE":
                return p.isProjectCreate();
            case "PROJECT.MANAGE_ALL":
                return p.isProjectManageAll();
            case "PROJECT.DELETE":
                return p.isProjectDelete();

            case "CHAT.CREATE_GROUP":
                return p.isChatCreateGroup();
            case "STORAGE.UPLOAD":
                return p.isStorageUpload();

            default:
                return false;
        }
    }

    /**
     * CẤP ĐỘ 0: Kiểm tra Plan Tier có cho phép feature không
     * Đây là cấp cao nhất - KHÔNG THỂ BYPASS
     */
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
                return plan.isHrModuleEnabled();
            case "AI":
                return plan.isAiModuleEnabled();
            case "WEBHOOK":
                return plan.isWebhookEnabled();
            case "API":
                return plan.isApiAccessEnabled();
            case "PROJECT":
            case "CHAT":
            case "STORAGE":
                return true; // Các module cơ bản luôn có
            default:
                return true; // Unknown feature, allow by default
        }
    }

    /**
     * CẤP ĐỘ 1: Kiểm tra Feature Flag của công ty (Admin có thể tắt/bật)
     */
    private boolean isFeatureEnabledForCompany(DoAn.BE.company.entity.CompanySettings settings, String feature) {
        if (settings == null) {
            // Personal Workspace hoặc missing settings = áp dụng FREE plan limits
            // KHÔNG cho phép tất cả nữa!
            return isPlanFeatureEnabled(Plan.FREE, feature);
        }

        switch (feature) {
            case "HR":
                return settings.isHrModuleEnabled();
            case "SALARY":
                // Lương phụ thuộc vào HR + Salary enabled
                return settings.isHrModuleEnabled() && settings.isSalaryEnabled();
            case "LEAVE":
                return settings.isHrModuleEnabled() && settings.isLeaveEnabled();
            case "ATTENDANCE":
                return settings.isHrModuleEnabled() && settings.isAttendanceEnabled();
            case "CONTRACT":
                // Hợp đồng phụ thuộc vào HR + Contract enabled
                return settings.isHrModuleEnabled() && settings.isContractEnabled();
            case "REVIEW":
                // Đánh giá phụ thuộc vào HR + Review enabled
                return settings.isHrModuleEnabled() && settings.isReviewEnabled();
            case "PROJECT":
                return settings.isProjectModuleEnabled();
            case "CHAT":
                return settings.isChatModuleEnabled();
            case "STORAGE":
                return settings.isStorageModuleEnabled();
            case "AI":
                return settings.isAiModuleEnabled();
            case "WEBHOOK":
                return settings.isWebhookEnabled();
            default:
                return true; // Unknown feature, allow by default or handle otherwise
        }
    }
}
