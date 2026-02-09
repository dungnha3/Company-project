package DoAn.BE.company.entity;

// Enum định nghĩa vai trò của thành viên trong công ty
public enum CompanyRole {
    OWNER, // Chủ sở hữu - quyền cao nhất
    ADMIN, // Quản trị viên - quản lý thành viên và cài đặt
    MANAGER_HR, // Quản lý nhân sự
    MANAGER_ACCOUNTING, // Quản lý kế toán
    MANAGER_PROJECT, // Quản lý dự án
    EMPLOYEE // Nhân viên
}
