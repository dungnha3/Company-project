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

    // Cache member per request để tránh duplicate DB queries
    private static final ThreadLocal<CompanyMember> cachedMember = new ThreadLocal<>();

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
        // Kiểm tra cache trước
        CompanyMember cached = cachedMember.get();
        if (cached != null) {
            return cached;
        }

        User user = getCurrentUser();
        Long companyId = getCurrentCompanyId();
        if (user == null || companyId == null) {
            return null;
        }

        CompanyMember member = memberRepository
                .findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(user.getUserId(), companyId)
                .orElse(null);
        cachedMember.set(member); // Cache cho request hiện tại
        return member;
    }

    // Gọi method này ở cuối request (trong filter) để clear cache
    public static void clearCache() {
        cachedMember.remove();
    }

    // ========================================================================
    // GRANULAR PERMISSION CHECKS
    // ========================================================================

    public void checkHrViewPermission() {
        checkDetailedPermission(PermissionKeys.HR_VIEW_LIST, "Bạn không có quyền xem danh sách nhân viên");
    }

    public void checkHrEditPermission() {
        checkDetailedPermission(PermissionKeys.HR_EDIT_PROFILE, "Bạn không có quyền chỉnh sửa hồ sơ nhân viên");
    }

    public void checkHrContractsPermission() {
        checkDetailedPermission(PermissionKeys.HR_MANAGE_CONTRACTS, "Bạn không có quyền quản lý hợp đồng");
    }

    public void checkHrReviewsPermission() {
        checkDetailedPermission(PermissionKeys.HR_MANAGE_REVIEWS, "Bạn không có quyền quản lý đánh giá nhân viên");
    }

    public void checkSalaryViewPermission() {
        checkDetailedPermission(PermissionKeys.SALARY_VIEW, "Bạn không có quyền xem bảng lương");
    }

    public void checkSalaryCalculatePermission() {
        checkDetailedPermission(PermissionKeys.SALARY_CALCULATE, "Bạn không có quyền tính lương");
    }

    public void checkSalaryApprovePermission() {
        checkDetailedPermission(PermissionKeys.SALARY_APPROVE, "Bạn không có quyền duyệt bảng lương");
    }

    public void checkLeaveApprovePermission() {
        checkDetailedPermission(PermissionKeys.LEAVE_APPROVE, "Bạn không có quyền duyệt đơn nghỉ phép");
    }

    public void checkLeaveViewAllPermission() {
        checkDetailedPermission(PermissionKeys.LEAVE_VIEW_ALL, "Bạn không có quyền xem tất cả đơn nghỉ phép");
    }

    public void checkProjectCreatePermission() {
        checkDetailedPermission(PermissionKeys.PROJECT_CREATE, "Bạn không có quyền tạo dự án mới");
    }

    public void checkProjectDeletePermission() {
        checkDetailedPermission(PermissionKeys.PROJECT_DELETE, "Bạn không có quyền xóa dự án");
    }

    public void checkProjectManageAllPermission() {
        checkDetailedPermission(PermissionKeys.PROJECT_MANAGE_ALL, "Bạn không có quyền quản lý tất cả dự án");
    }

    public void checkChatCreateGroupPermission() {
        checkDetailedPermission(PermissionKeys.CHAT_CREATE_GROUP, "Bạn không có quyền tạo nhóm chat");
    }

    public void checkStorageUploadPermission() {
        checkDetailedPermission(PermissionKeys.STORAGE_UPLOAD, "Bạn không có quyền upload file");
    }

    // ========================================================================
    // CORE LOGIC
    // ========================================================================

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
        return member.hasAnyRole(CompanyRole.OWNER, CompanyRole.ADMIN);
    }

    // ========================================================================
    // HELPER METHODS
    // ========================================================================

    public boolean canViewEmployeeProfile(User currentUser, Long targetEmployeeUserId) {
        if (currentUser == null)
            return false;
        if (currentUser.getUserId().equals(targetEmployeeUserId))
            return true;
        try {
            checkHrViewPermission();
            return true;
        } catch (ForbiddenException e) {
            return false;
        }
    }

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

    public void checkAdminPermission(User currentUser) {
        CompanyMember member = getCurrentMember();
        if (member == null || !isCompanyAdminOrOwner(member)) {
            throw new ForbiddenException("Chỉ Quản trị viên mới có quyền thực hiện thao tác này");
        }
    }

    public boolean isHRManager() {
        CompanyMember member = getCurrentMember();
        if (member == null)
            return false;
        return isCompanyAdminOrOwner(member) || member.hasAnyRole(CompanyRole.MANAGER_HR)
                || permissionService.hasPermission(member, "HR", "VIEW_LIST");
    }

    public boolean isAccountingManager() {
        CompanyMember member = getCurrentMember();
        if (member == null)
            return false;
        return isCompanyAdminOrOwner(member) || member.hasAnyRole(CompanyRole.MANAGER_ACCOUNTING)
                || permissionService.hasPermission(member, "SALARY", "VIEW");
    }

    public boolean isProjectManager() {
        CompanyMember member = getCurrentMember();
        if (member == null)
            return false;
        return isCompanyAdminOrOwner(member) || member.hasAnyRole(CompanyRole.MANAGER_PROJECT)
                || permissionService.hasPermission(member, "PROJECT", "CREATE");
    }

    public boolean isAnyManager() {
        return isHRManager() || isAccountingManager() || isProjectManager();
    }

    public boolean isOwnerOrAdmin() {
        CompanyMember member = getCurrentMember();
        return member != null && isCompanyAdminOrOwner(member);
    }

    public boolean canApproveLeave(User user) {
        return isProjectManager() || isAccountingManager() || isOwnerOrAdmin();
    }

    public boolean canViewLeave(User user) {
        // Employees can view their own (checked in service), Managers can view all
        return isAnyManager();
    }

    public boolean canUseChat(User user) {
        // All active users who are members of the company can use chat
        if (user == null || !Boolean.TRUE.equals(user.getIsActive())) {
            return false;
        }
        return getCurrentMember() != null;
    }

    public boolean canAccessProjects(User user) {
        if (user != null && user.isSystemAdminAccount()) {
            return true;
        }

        CompanyMember member = getCurrentMember();
        if (member == null) {
            return false;
        }

        return member.hasAnyRole(CompanyRole.OWNER, CompanyRole.ADMIN, CompanyRole.MANAGER_PROJECT,
                CompanyRole.EMPLOYEE);
    }

    public void checkPermission(Long companyId, CompanyRole requiredRole) {
        CompanyMember member = getCurrentMember();
        if (member == null) {
            throw new ForbiddenException("Bạn không phải là thành viên của công ty này");
        }

        // Owner/Admin always have permission
        if (isCompanyAdminOrOwner(member)) {
            return;
        }

        if (!member.hasAnyRole(requiredRole)) {
            throw new ForbiddenException("Bạn không có quyền thực hiện thao tác này");
        }
    }

    public void checkHRPermission(User user) {
        if (!isHRManager()) {
            throw new ForbiddenException("Yêu cầu quyền Quản lý nhân sự");
        }
    }
}