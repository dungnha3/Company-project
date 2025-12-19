package DoAn.BE.common.util;

import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.user.entity.User;

/**
 * Utility class để kiểm tra quyền truy cập
 */
public class PermissionUtil {
    
    /**
     * Kiểm tra user có phải là chủ sở hữu dữ liệu không
     */
    public static void checkOwnership(User currentUser, Long targetUserId, String message) {
        if (!currentUser.getUserId().equals(targetUserId) && !currentUser.isAnyManager() && !currentUser.isAdmin()) {
            throw new ForbiddenException(message != null ? message : "Bạn không có quyền truy cập dữ liệu này");
        }
    }
    
    /**
     * Kiểm tra user có quyền quản lý HR không
     */
    public static void checkHRPermission(User currentUser) {
        if (!currentUser.isManagerHR()) {
            throw new ForbiddenException("Chỉ HR Manager mới có quyền thực hiện thao tác này");
        }
    }
    
    /**
     * Kiểm tra user có quyền quản lý kế toán không (chỉ xem)
     */
    public static void checkAccountingViewPermission(User currentUser) {
        if (!currentUser.isManagerAccounting()) {
            throw new ForbiddenException("Chỉ Accounting Manager mới có quyền xem dữ liệu này");
        }
    }
    
    /**
     * Kiểm tra user có quyền thao tác chấm công không (chỉ ACCOUNTING)
     * FIXED: Theo SecurityConfig line 57, chỉ ACCOUNTING manage chấm công
     */
    public static void checkAttendanceManagePermission(User currentUser) {
        if (!currentUser.isManagerAccounting()) {
            throw new ForbiddenException("Chỉ Accounting Manager mới có quyền quản lý chấm công");
        }
    }
    
    /**
     * Kiểm tra user có quyền quản lý dự án không
     */
    public static void checkProjectManagerPermission(User currentUser) {
        if (!currentUser.isManagerProject()) {
            throw new ForbiddenException("Chỉ Project Manager mới có quyền thực hiện thao tác này");
        }
    }
    
    /**
     * Kiểm tra user có phải Admin không
     */
    public static void checkAdminPermission(User currentUser) {
        if (!currentUser.isAdmin()) {
            throw new ForbiddenException("Chỉ Admin mới có quyền thực hiện thao tác này");
        }
    }
    
    /**
     * Kiểm tra user có quyền xem profile nhân viên không
     * - Employee/Managers: chỉ xem của mình
     * - Manager HR/Accounting: xem tất cả
     * - Manager Project: xem nhân viên trong dự án (kiểm tra ở service)
     */
    public static boolean canViewEmployeeProfile(User currentUser, Long targetEmployeeUserId) {
        // Admin không có quyền xem
        if (currentUser.isAdmin()) {
            return false;
        }
        
        // HR và Accounting xem tất cả
        if (currentUser.isManagerHR() || currentUser.isManagerAccounting()) {
            return true;
        }
        
        // Employee và Project Manager chỉ xem của mình
        // Project Manager xem nhân viên trong dự án được kiểm tra ở service layer
        return currentUser.getUserId().equals(targetEmployeeUserId);
    }
    
    /**
     * Kiểm tra user có quyền chỉnh sửa profile nhân viên không
     */
    public static boolean canEditEmployeeProfile(User currentUser, Long targetEmployeeUserId) {
        // Chỉ HR Manager mới có quyền chỉnh sửa
        return currentUser.isManagerHR();
    }
    
    /**
     * Kiểm tra user có quyền duyệt nghỉ phép không - Chỉ Project Manager
     */
    public static boolean canApproveLeave(User currentUser) {
        return currentUser.isManagerProject();
    }
    
    /**
     * Kiểm tra user có quyền tính lương không
     */
    public static boolean canCalculateSalary(User currentUser) {
        return currentUser.isManagerAccounting();
    }
    
    /**
     * Kiểm tra user có quyền chat không (Admin không có quyền chat)
     */
    public static boolean canUseChat(User currentUser) {
        return !currentUser.isAdmin();
    }
    
    /**
     * Kiểm tra user có quyền truy cập dự án không
     * Admin không có quyền truy cập dự án
     * HR/Accounting Manager có quyền như Employee
     */
    public static boolean canAccessProjects(User currentUser) {
        return !currentUser.isAdmin();
    }
    
    /**
     * Kiểm tra user có quyền xem dữ liệu chấm công không
     */
    public static boolean canViewAttendance(User currentUser) {
        return currentUser.isManagerHR() || currentUser.isManagerAccounting();
    }
    
    /**
     * Kiểm tra user có quyền xem dữ liệu nghỉ phép không - HR, Accounting, Project Manager
     */
    public static boolean canViewLeave(User currentUser) {
        return currentUser.isManagerHR() || currentUser.isManagerAccounting() || currentUser.isManagerProject();
    }
    
    /**
     * Kiểm tra user có quyền thực hiện chấm công không - Tất cả trừ Admin
     */
    public static boolean canPerformAttendance(User currentUser) {
        return !currentUser.isAdmin();
    }
    
    /**
     * Kiểm tra user có quyền xem chấm công team không
     * HR/Accounting: xem tất cả
     * Project Manager: xem team trong dự án (kiểm tra ở service)
     */
    public static boolean canViewTeamAttendance(User currentUser) {
        return currentUser.isManagerHR() || currentUser.isManagerAccounting() || currentUser.isManagerProject();
    }
}
