package DoAn.BE.company.entity;

import java.io.Serializable;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// POJO lưu trữ quyền hạn chi tiết của user trong công ty (serialize thành JSON)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserPermissions implements Serializable {

    private static final long serialVersionUID = 1L;

    // ===== NHÓM HR =====
    private boolean hrViewList = false; // Xem danh sách nhân viên
    private boolean hrEditProfile = false; // Sửa thông tin nhân viên
    private boolean hrManageContracts = false; // Quản lý hợp đồng

    // ===== NHÓM LƯƠNG =====
    private boolean salaryView = false; // Xem bảng lương
    private boolean salaryCalculate = false; // Tính lương
    private boolean salaryApprove = false; // Duyệt lương

    // ===== NHÓM NGHỈ PHÉP =====
    private boolean leaveApprove = false; // Duyệt nghỉ phép
    private boolean leaveViewAll = false; // Xem tất cả đơn nghỉ

    // ===== NHÓM CHẤM CÔNG =====
    private boolean attendanceViewAll = false; // Xem chấm công toàn bộ
    private boolean attendanceEdit = false; // Sửa chấm công

    // ===== NHÓM DỰ ÁN =====
    private boolean projectCreate = false; // Tạo dự án
    private boolean projectManageAll = false; // Quản lý tất cả dự án
    private boolean projectDelete = false; // Xóa dự án

    // ===== NHÓM CHAT =====
    private boolean chatCreateGroup = true; // Tạo group chat

    // ===== NHÓM LƯU TRỮ =====
    private boolean storageUpload = true; // Tải lên file
    private long storageLimit = 104_857_600L; // Mặc định 100MB

    // Clone method để tạo bản sao từ template
    public UserPermissions clone() {
        UserPermissions copy = new UserPermissions();
        copy.hrViewList = this.hrViewList;
        copy.hrEditProfile = this.hrEditProfile;
        copy.hrManageContracts = this.hrManageContracts;
        copy.salaryView = this.salaryView;
        copy.salaryCalculate = this.salaryCalculate;
        copy.salaryApprove = this.salaryApprove;
        copy.leaveApprove = this.leaveApprove;
        copy.leaveViewAll = this.leaveViewAll;
        copy.attendanceViewAll = this.attendanceViewAll;
        copy.attendanceEdit = this.attendanceEdit;
        copy.projectCreate = this.projectCreate;
        copy.projectManageAll = this.projectManageAll;
        copy.projectDelete = this.projectDelete;
        copy.chatCreateGroup = this.chatCreateGroup;
        copy.storageUpload = this.storageUpload;
        copy.storageLimit = this.storageLimit;
        return copy;
    }
}
