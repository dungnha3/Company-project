/**
 * Permission Utility - FE Version
 * Replicate from BE PermissionUtil.java
 * Dùng để hide/show UI elements dựa trên role
 */

export const PermissionUtil = {
  /**
   * Kiểm tra user có quyền xem profile nhân viên không
   * - Admin: KHÔNG có quyền xem
   * - HR/Accounting: xem TẤT CẢ
   * - Project Manager/Employee: chỉ xem của MÌNH
   */
  canViewEmployeeProfile(currentUser, targetUserId) {
    if (!currentUser) return false;
    
    // Admin không có quyền xem business data
    if (currentUser.role === 'ADMIN') return false;
    
    // HR và Accounting xem tất cả
    if (['MANAGER_HR', 'MANAGER_ACCOUNTING'].includes(currentUser.role)) {
      return true;
    }
    
    // Employee và Project Manager chỉ xem của mình
    // Note: Project Manager xem nhân viên trong dự án được kiểm tra ở service layer
    return currentUser.userId === targetUserId;
  },

  /**
   * Kiểm tra user có quyền chỉnh sửa profile nhân viên không
   * Chỉ HR Manager mới có quyền CRUD nhân viên
   */
  canEditEmployeeProfile(currentUser) {
    if (!currentUser) return false;
    return currentUser.role === 'MANAGER_HR';
  },

  /**
   * Kiểm tra user có quyền duyệt nghỉ phép không (Step 1)
   * Chỉ Project Manager mới duyệt step 1
   */
  canApproveLeaveStep1(currentUser) {
    if (!currentUser) return false;
    return currentUser.role === 'MANAGER_PROJECT';
  },

  /**
   * Kiểm tra user có quyền duyệt nghỉ phép step 2 không
   * Chỉ Accounting Manager mới duyệt step 2
   */
  canApproveLeaveStep2(currentUser) {
    if (!currentUser) return false;
    return currentUser.role === 'MANAGER_ACCOUNTING';
  },

  /**
   * Kiểm tra user có quyền tính lương không
   * Chỉ Accounting Manager có quyền
   */
  canCalculateSalary(currentUser) {
    if (!currentUser) return false;
    return currentUser.role === 'MANAGER_ACCOUNTING';
  },

  /**
   * Kiểm tra user có quyền xem bảng lương không
   * - Accounting: xem TẤT CẢ (FULL data)
   * - Employee: chỉ xem của MÌNH (MASKED data)
   * - HR/PM: KHÔNG có quyền xem
   */
  canViewPayroll(currentUser) {
    if (!currentUser) return false;
    return ['MANAGER_ACCOUNTING', 'EMPLOYEE'].includes(currentUser.role);
  },

  /**
   * Kiểm tra user có quyền quản lý bảng lương không
   * Chỉ Accounting Manager có CRUD quyền
   */
  canManagePayroll(currentUser) {
    if (!currentUser) return false;
    return currentUser.role === 'MANAGER_ACCOUNTING';
  },

  /**
   * Kiểm tra user có quyền chat không
   * Admin KHÔNG có quyền chat
   */
  canUseChat(currentUser) {
    if (!currentUser) return false;
    return currentUser.role !== 'ADMIN';
  },

  /**
   * Kiểm tra user có quyền truy cập dự án không
   * Admin KHÔNG có quyền truy cập dự án
   */
  canAccessProjects(currentUser) {
    if (!currentUser) return false;
    return currentUser.role !== 'ADMIN';
  },

  /**
   * Kiểm tra user có quyền xem dữ liệu chấm công không
   * HR: xem stats only (không manage)
   * Accounting: xem và manage TẤT CẢ
   */
  canViewAttendance(currentUser) {
    if (!currentUser) return false;
    return ['MANAGER_HR', 'MANAGER_ACCOUNTING'].includes(currentUser.role);
  },

  /**
   * Kiểm tra user có quyền quản lý chấm công không
   * CHỈ Accounting Manager có quyền manage
   * HR chỉ xem stats, KHÔNG manage
   */
  canManageAttendance(currentUser) {
    if (!currentUser) return false;
    return currentUser.role === 'MANAGER_ACCOUNTING';
  },

  /**
   * Kiểm tra user có quyền xem dữ liệu nghỉ phép không
   * HR, Accounting, Project Manager đều có quyền xem
   */
  canViewLeave(currentUser) {
    if (!currentUser) return false;
    return ['MANAGER_HR', 'MANAGER_ACCOUNTING', 'MANAGER_PROJECT'].includes(currentUser.role);
  },

  /**
   * Kiểm tra user có quyền thực hiện chấm công không (check-in/out)
   * Tất cả TRỪ Admin
   */
  canPerformAttendance(currentUser) {
    if (!currentUser) return false;
    return currentUser.role !== 'ADMIN';
  },

  /**
   * Kiểm tra user có quyền xem chấm công team không
   * HR/Accounting: xem tất cả
   * Project Manager: xem team trong dự án (check ở service)
   */
  canViewTeamAttendance(currentUser) {
    if (!currentUser) return false;
    return ['MANAGER_HR', 'MANAGER_ACCOUNTING', 'MANAGER_PROJECT'].includes(currentUser.role);
  },

  /**
   * Kiểm tra user có quyền admin không
   * Chỉ dùng cho Users Management, Role Requests, Audit Logs
   */
  isAdmin(currentUser) {
    if (!currentUser) return false;
    return currentUser.role === 'ADMIN';
  },

  /**
   * Kiểm tra user có phải HR Manager không
   */
  isHRManager(currentUser) {
    if (!currentUser) return false;
    return currentUser.role === 'MANAGER_HR';
  },

  /**
   * Kiểm tra user có phải Accounting Manager không
   */
  isAccountingManager(currentUser) {
    if (!currentUser) return false;
    return currentUser.role === 'MANAGER_ACCOUNTING';
  },

  /**
   * Kiểm tra user có phải Project Manager không
   */
  isProjectManager(currentUser) {
    if (!currentUser) return false;
    return currentUser.role === 'MANAGER_PROJECT';
  },

  /**
   * Kiểm tra user có phải Employee không
   */
  isEmployee(currentUser) {
    if (!currentUser) return false;
    return currentUser.role === 'EMPLOYEE';
  }
};
