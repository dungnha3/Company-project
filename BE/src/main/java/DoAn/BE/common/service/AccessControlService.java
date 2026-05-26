package DoAn.BE.common.service;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import DoAn.BE.common.context.TenantContext;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.company.entity.CompanyMember;
import DoAn.BE.company.entity.CompanyRole;
import DoAn.BE.company.repository.CompanyMemberRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.company.constant.PermissionKeys;
import lombok.RequiredArgsConstructor;

// [Service kiểm soát quyền truy cập] (Refactored for Granular Permissions)
@Service
@RequiredArgsConstructor
public class AccessControlService {

    private final CompanyMemberRepository memberRepository;
    private final PermissionService permissionService;

    private static final java.util.Map<String, Object> permissionCache = new java.util.concurrent.ConcurrentHashMap<>();

    public static void clearCache() {
        permissionCache.clear();
    }

    public User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof User)) {
            return null;
        }
        return (User) auth.getPrincipal();
    }

    public Long getCurrentCompanyId() {
        return TenantContext.getCompanyId();
    }

    public CompanyMember getCurrentMember() {
        User user = getCurrentUser();
        Long companyId = getCurrentCompanyId();
        if (user == null || companyId == null) {
            return null;
        }

        return memberRepository
                .findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(user.getUserId(), companyId)
                .orElse(null);
    }

    // Use this when you want to CHECK permission without throwing

    // --- HR ---
    public void checkHrViewPermission() {
        checkDetailedPermission(PermissionKeys.HR_VIEW_LIST, "Bạn không có quyền xem danh sách nhân viên");
    }

    public void checkHrEditPermission() {
        checkDetailedPermission(PermissionKeys.HR_EDIT_PROFILE, "Bạn không có quyền chỉnh sửa hồ sơ nhân viên");
    }

    public void checkHrCreateEmployeePermission() {
        checkDetailedPermission(PermissionKeys.HR_CREATE_EMPLOYEE, "Bạn không có quyền thêm nhân viên");
    }

    public void checkHrDeleteEmployeePermission() {
        checkDetailedPermission(PermissionKeys.HR_DELETE_EMPLOYEE, "Bạn không có quyền xóa nhân viên");
    }

    public void checkHrReviewsPermission() {
        checkDetailedPermission(PermissionKeys.HR_MANAGE_REVIEWS, "Bạn không có quyền quản lý đánh giá nhân viên");
    }

    public void checkHrViewDashboardPermission() {
        checkDetailedPermission(PermissionKeys.HR_VIEW_DASHBOARD, "Bạn không có quyền xem HR Dashboard");
    }

    public void checkHrExportPermission() {
        checkDetailedPermission(PermissionKeys.HR_EXPORT, "Bạn không có quyền xuất dữ liệu HR");
    }

    // --- Leave ---
    public void checkLeaveApprovePermission() {
        checkDetailedPermission(PermissionKeys.LEAVE_APPROVE, "Bạn không có quyền duyệt đơn nghỉ phép");
    }

    public void checkLeaveViewAllPermission() {
        checkDetailedPermission(PermissionKeys.LEAVE_VIEW_ALL, "Bạn không có quyền xem tất cả đơn nghỉ phép");
    }

    // --- Review ---
    public void checkReviewViewAllPermission() {
        checkDetailedPermission(PermissionKeys.REVIEW_VIEW_ALL, "Bạn không có quyền xem đánh giá");
    }

    public void checkReviewCreatePermission() {
        checkDetailedPermission(PermissionKeys.REVIEW_CREATE, "Bạn không có quyền tạo đánh giá");
    }

    public void checkReviewApprovePermission() {
        checkDetailedPermission(PermissionKeys.REVIEW_APPROVE, "Bạn không có quyền duyệt đánh giá");
    }

    // --- Project ---
    public void checkProjectCreatePermission() {
        checkDetailedPermission(PermissionKeys.PROJECT_CREATE, "Bạn không có quyền tạo dự án mới");
    }

    public void checkProjectDeletePermission() {
        checkDetailedPermission(PermissionKeys.PROJECT_DELETE, "Bạn không có quyền xóa dự án");
    }

    public void checkProjectManageAllPermission() {
        checkDetailedPermission(PermissionKeys.PROJECT_MANAGE_ALL, "Bạn không có quyền quản lý tất cả dự án");
    }

    public void checkProjectManageIssuesPermission() {
        checkDetailedPermission(PermissionKeys.PROJECT_MANAGE_ISSUES, "Bạn không có quyền quản lý issues");
    }

    public void checkProjectManageSprintsPermission() {
        checkDetailedPermission(PermissionKeys.PROJECT_MANAGE_SPRINTS, "Bạn không có quyền quản lý sprints");
    }

    public void checkProjectViewDashboardPermission() {
        checkDetailedPermission(PermissionKeys.PROJECT_VIEW_DASHBOARD, "Bạn không có quyền xem dashboard dự án");
    }

    public void checkProjectExportPermission() {
        checkDetailedPermission(PermissionKeys.PROJECT_EXPORT, "Bạn không có quyền xuất dữ liệu dự án");
    }

    public void checkProjectManagePhasesPermission() {
        checkDetailedPermission(PermissionKeys.PROJECT_MANAGE_PHASES, "Bạn không có quyền quản lý phases");
    }

    public void checkProjectResourcePlanningPermission() {
        checkDetailedPermission(PermissionKeys.PROJECT_RESOURCE_PLANNING, "Bạn không có quyền phân bổ nguồn lực");
    }

    // --- Time Tracking ---
    public void checkTimetrackingLogPermission() {
        checkDetailedPermission(PermissionKeys.TIMETRACKING_LOG, "Bạn không có quyền log time");
    }

    public void checkTimetrackingViewAllPermission() {
        checkDetailedPermission(PermissionKeys.TIMETRACKING_VIEW_ALL, "Bạn không có quyền xem tất cả time log");
    }

    // --- Analytics ---
    public void checkAnalyticsViewPermission() {
        checkDetailedPermission(PermissionKeys.ANALYTICS_VIEW, "Bạn không có quyền xem analytics");
    }

    // --- Calendar ---
    public void checkCalendarViewPermission() {
        checkDetailedPermission(PermissionKeys.CALENDAR_VIEW, "Bạn không có quyền xem lịch");
    }

    public void checkCalendarManagePermission() {
        checkDetailedPermission(PermissionKeys.CALENDAR_MANAGE, "Bạn không có quyền quản lý sự kiện");
    }

    // =====================================================================
    // CORE LOGIC
    // =====================================================================

    private void checkDetailedPermission(String permissionKey, String errorMessage) {
        User currentUser = getCurrentUser();
        if (currentUser != null && currentUser.isSystemAdminAccount()) {
            return; // System Admin always allowed
        }

        CompanyMember member = getCurrentMember();
        if (member == null) {
            throw new ForbiddenException("Bạn không phải là thành viên của công ty này");
        }

        if (isCompanyAdminOrOwner(member)) {
            return;
        }

        String[] parts = permissionKey.split("\\.");
        if (parts.length != 2) {
            if (!permissionService.hasPermission(member, permissionKey, permissionKey)) {
                throw new ForbiddenException(errorMessage);
            }
            return;
        }

        if (!permissionService.hasPermission(member, parts[0], parts[1])) {
            throw new ForbiddenException(errorMessage);
        }
    }

    private boolean isCompanyAdminOrOwner(CompanyMember member) {
        return member.hasAnyRole(CompanyRole.OWNER, CompanyRole.COMPANY_ADMIN);
    }

    // =====================================================================
    // HELPER METHODS
    // =====================================================================

    public void checkOwnership(User currentUser, Long targetUserId, String message) {
        if (currentUser == null) {
            throw new ForbiddenException("Vui lòng đăng nhập để thực hiện thao tác");
        }
        boolean isOwner = currentUser.getUserId().equals(targetUserId);
        if (!isOwner) {
            CompanyMember member = getCurrentMember();
            if (member == null || !isCompanyAdminOrOwner(member)) {
                throw new ForbiddenException(message != null ? message : "Bạn không có quyền truy cập dữ liệu này");
            }
        }
    }

    public void checkCompanyAdminPermission() {
        CompanyMember member = getCurrentMember();
        if (member == null || !isCompanyAdminOrOwner(member)) {
            throw new ForbiddenException("Chỉ Quản trị viên công ty mới có quyền thực hiện thao tác này");
        }
    }

    public boolean isOwnerOrAdmin() {
        CompanyMember member = getCurrentMember();
        return member != null && isCompanyAdminOrOwner(member);
    }

    public boolean canUseChat(User user) {
        if (user == null || !Boolean.TRUE.equals(user.getIsActive())) {
            return false;
        }
        return getCurrentMember() != null;
    }

    // Replaced legacy: uses granular permission instead of hardcoded roles
    public boolean canAccessProjects(User user) {
        if (user != null && user.isSystemAdminAccount()) {
            return true;
        }
        return hasPermission(PermissionKeys.PROJECT_VIEW);
    }

    public void checkPermission(Long companyId, CompanyRole requiredRole) {
        checkPermission(companyId, new CompanyRole[]{ requiredRole });
    }

    public void checkPermission(Long companyId, CompanyRole... requiredRoles) {
        User user = getCurrentUser();
        if (user == null) {
            throw new ForbiddenException("Vui lòng đăng nhập");
        }
        if (user.isSystemAdminAccount()) {
            return;
        }

        CompanyMember member = memberRepository
                .findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(user.getUserId(), companyId)
                .orElseThrow(() -> new ForbiddenException("Bạn không phải là thành viên của công ty này"));

        if (isCompanyAdminOrOwner(member)) {
            return;
        }

        boolean hasRole = false;
        for (CompanyRole role : requiredRoles) {
            if (member.hasAnyRole(role)) {
                hasRole = true;
                break;
            }
        }
        if (!hasRole) {
            throw new ForbiddenException("Bạn không có quyền thực hiện thao tác này");
        }
    }

    // Use this when you want to CHECK permission without throwing
    public boolean hasPermission(String permissionKey) {
        User currentUser = getCurrentUser();
        if (currentUser != null && currentUser.isSystemAdminAccount()) {
            return true;
        }

        CompanyMember member = getCurrentMember();
        if (member == null) {
            return false;
        }

        if (isCompanyAdminOrOwner(member)) {
            return true;
        }

        String[] parts = permissionKey.split("\\.");
        if (parts.length != 2) {
            return permissionService.hasPermission(member, permissionKey, permissionKey);
        }
        return permissionService.hasPermission(member, parts[0], parts[1]);
    }

}