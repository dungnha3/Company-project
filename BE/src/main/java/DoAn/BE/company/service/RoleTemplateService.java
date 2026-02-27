package DoAn.BE.company.service;

import org.springframework.stereotype.Service;

import DoAn.BE.company.entity.CompanyRole;
import DoAn.BE.company.entity.UserPermissions;

@Service
public class RoleTemplateService {

    public UserPermissions getTemplate(java.util.Set<CompanyRole> roles) {
        UserPermissions mergedPermissions = new UserPermissions();

        if (roles == null || roles.isEmpty()) {
            return mergedPermissions;
        }

        for (CompanyRole role : roles) {
            UserPermissions rolePermissions = getPermissionsForSingleRole(role);
            mergedPermissions = mergePermissions(mergedPermissions, rolePermissions);
        }

        return mergedPermissions;
    }

    private UserPermissions getPermissionsForSingleRole(CompanyRole role) {
        UserPermissions p = new UserPermissions();
        switch (role) {
            case OWNER:
            case ADMIN:
                setAllTrue(p);
                break;
            case MANAGER_HR:
                // Nhân sự (HR)
                p.setHrViewList(true);
                p.setHrEditProfile(true);
                p.setHrManageContracts(true);
                // Chấm công (Attendance)
                p.setAttendanceViewAll(true);
                p.setAttendanceEdit(true);
                // Nghỉ phép (Leave)
                p.setLeaveApprove(true);
                p.setLeaveViewAll(true);
                // Lưu trữ (Storage)
                p.setStorageLimit(500 * 1024 * 1024L); // 500MB
                break;
            case MANAGER_ACCOUNTING:
                // Lương (Salary)
                p.setSalaryView(true);
                p.setSalaryCalculate(true);
                p.setSalaryApprove(true);
                // Chấm công
                p.setAttendanceViewAll(true);
                // Nghỉ phép
                p.setLeaveApprove(true);
                p.setLeaveViewAll(true);
                break;
            case MANAGER_PROJECT:
                // Dự án (Project)
                p.setProjectCreate(true);
                p.setProjectManageAll(true);
                p.setProjectDelete(true);
                // Nghỉ phép
                p.setLeaveApprove(true);
                p.setLeaveViewAll(false);
                break;
            case EMPLOYEE:
            default:
                // Quyền cơ bản cho Nhân viên
                p.setChatCreateGroup(true);
                p.setStorageUpload(true);
                p.setStorageLimit(100 * 1024 * 1024L); // 100MB
                break;
        }
        return p;
    }

    private UserPermissions mergePermissions(UserPermissions p1, UserPermissions p2) {
        UserPermissions merged = p1.clone();

        // HR Group
        if (p2.isHrViewList())
            merged.setHrViewList(true);
        if (p2.isHrEditProfile())
            merged.setHrEditProfile(true);
        if (p2.isHrManageContracts())
            merged.setHrManageContracts(true);

        // Salary Group
        if (p2.isSalaryView())
            merged.setSalaryView(true);
        if (p2.isSalaryCalculate())
            merged.setSalaryCalculate(true);
        if (p2.isSalaryApprove())
            merged.setSalaryApprove(true);

        // Leave Group
        if (p2.isLeaveApprove())
            merged.setLeaveApprove(true);
        if (p2.isLeaveViewAll())
            merged.setLeaveViewAll(true);

        // Attendance Group
        if (p2.isAttendanceViewAll())
            merged.setAttendanceViewAll(true);
        if (p2.isAttendanceEdit())
            merged.setAttendanceEdit(true);

        // Project Group
        if (p2.isProjectCreate())
            merged.setProjectCreate(true);
        if (p2.isProjectManageAll())
            merged.setProjectManageAll(true);
        if (p2.isProjectDelete())
            merged.setProjectDelete(true);

        // Chat Group
        if (p2.isChatCreateGroup())
            merged.setChatCreateGroup(true);

        // Storage Group (Max limit wins)
        if (p2.isStorageUpload())
            merged.setStorageUpload(true);
        if (p2.getStorageLimit() > merged.getStorageLimit())
            merged.setStorageLimit(p2.getStorageLimit());

        return merged;
    }

    private void setAllTrue(UserPermissions p) {
        p.setHrViewList(true);
        p.setHrEditProfile(true);
        p.setHrManageContracts(true);
        p.setSalaryView(true);
        p.setSalaryCalculate(true);
        p.setSalaryApprove(true);
        p.setLeaveApprove(true);
        p.setLeaveViewAll(true);
        p.setAttendanceViewAll(true);
        p.setAttendanceEdit(true);
        p.setProjectCreate(true);
        p.setProjectManageAll(true);
        p.setProjectDelete(true);
        p.setChatCreateGroup(true);
        p.setStorageUpload(true);
        p.setStorageLimit(10L * 1024 * 1024 * 1024); // 10GB cho Admin
    }
}
