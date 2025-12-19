/**
 * usePermissions Hook
 * Custom hook để sử dụng permission checks trong components
 * Automatically get current user from AuthContext
 */

import { useAuth } from '@/features/auth/hooks/useAuth';
import { PermissionUtil } from '@/shared/utils/permissions';

export const usePermissions = () => {
  const { user } = useAuth();

  return {
    // User info
    user,
    isAuthenticated: !!user,
    
    // Role checks
    isAdmin: PermissionUtil.isAdmin(user),
    isHRManager: PermissionUtil.isHRManager(user),
    isAccountingManager: PermissionUtil.isAccountingManager(user),
    isProjectManager: PermissionUtil.isProjectManager(user),
    isEmployee: PermissionUtil.isEmployee(user),
    
    // Permission checks - Employee
    canViewEmployeeProfile: (targetUserId) => 
      PermissionUtil.canViewEmployeeProfile(user, targetUserId),
    canEditEmployeeProfile: () => 
      PermissionUtil.canEditEmployeeProfile(user),
    
    // Permission checks - Leave
    canViewLeave: () => 
      PermissionUtil.canViewLeave(user),
    canApproveLeaveStep1: () => 
      PermissionUtil.canApproveLeaveStep1(user),
    canApproveLeaveStep2: () => 
      PermissionUtil.canApproveLeaveStep2(user),
    
    // Permission checks - Payroll
    canViewPayroll: () => 
      PermissionUtil.canViewPayroll(user),
    canManagePayroll: () => 
      PermissionUtil.canManagePayroll(user),
    canCalculateSalary: () => 
      PermissionUtil.canCalculateSalary(user),
    
    // Permission checks - Attendance
    canViewAttendance: () => 
      PermissionUtil.canViewAttendance(user),
    canManageAttendance: () => 
      PermissionUtil.canManageAttendance(user),
    canPerformAttendance: () => 
      PermissionUtil.canPerformAttendance(user),
    canViewTeamAttendance: () => 
      PermissionUtil.canViewTeamAttendance(user),
    
    // Permission checks - Other
    canUseChat: () => 
      PermissionUtil.canUseChat(user),
    canAccessProjects: () => 
      PermissionUtil.canAccessProjects(user),
  };
};
