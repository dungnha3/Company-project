package DoAn.BE.company.service;

import org.springframework.stereotype.Service;

import DoAn.BE.company.entity.CompanyRole;
import DoAn.BE.company.entity.UserPermissions;

@Service
public class RoleTemplateService {

    // Lấy mẫu phân quyền mặc định dựa trên Vai trò (Role)
    public UserPermissions getTemplate(CompanyRole role) {
        UserPermissions p = new UserPermissions();
        if (role == null)
            return p;

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
                p.setLeaveViewAll(true); // Cần xem nghỉ phép để tính lương
                break;

            case MANAGER_PROJECT:
                // Dự án (Project)
                p.setProjectCreate(true);
                p.setProjectManageAll(true);
                p.setProjectDelete(true);
                // Nghỉ phép
                p.setLeaveApprove(true); // Duyệt nghỉ cho team member
                p.setLeaveViewAll(false); // Thường chỉ xem của team (logic xử lý ở service)
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

    // Helper: Cấp full quyền (Admin/Owner)
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
