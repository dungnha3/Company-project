package DoAn.BE.company.entity;

// Enum định nghĩa vai trò của thành viên trong công ty
public enum CompanyRole {
    OWNER, // Chủ sở hữu - quyền cao nhất, duy nhất
    COMPANY_ADMIN, // Quản trị viên - chỉ OWNER mới gán được
    EMPLOYEE // Thành viên thường - mặc định khi join
}
