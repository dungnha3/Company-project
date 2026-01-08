package DoAn.BE.common.service;

import org.springframework.stereotype.Service;

import DoAn.BE.company.entity.CompanyMember;
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
        if (member == null || member.getRole() == null || member.getPermissions() == null) {
            return false;
        }

        // Owner/Admin luôn có quyền truy cập (Cơ chế an toàn)
        if (member.getRole() == DoAn.BE.company.entity.CompanyRole.OWNER ||
                member.getRole() == DoAn.BE.company.entity.CompanyRole.ADMIN) {
            return true;
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

    // Kiểm tra Feature Flag của công ty (Level 1)
    private boolean isFeatureEnabledForCompany(DoAn.BE.company.entity.CompanySettings settings, String feature) {
        if (settings == null)
            return true; // Fail-open or close based on policy. Assume enabled for legacy.

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
            default:
                return true; // Unknown feature, allow by default or handle otherwise
        }
    }
}
