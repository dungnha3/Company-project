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

    private static final long serialVersionUID = 2L;

    // ===== NHÓM HR =====
    private boolean hrViewList = false;
    private boolean hrEditProfile = false;
    private boolean hrCreateEmployee = false;
    private boolean hrDeleteEmployee = false;
    private boolean hrManageContracts = false;
    private boolean hrManageReviews = false;
    private boolean hrViewDepartments = false;
    private boolean hrManageDepartments = false;
    private boolean hrViewPositions = false;
    private boolean hrManagePositions = false;
    private boolean hrViewDashboard = false;
    private boolean hrExport = false;

    // ===== NHÓM HỢP ĐỒNG =====
    private boolean contractView = false;
    private boolean contractCreate = false;
    private boolean contractEdit = false;
    private boolean contractDelete = false;
    private boolean contractRenew = false;

    // ===== NHÓM LƯƠNG =====
    private boolean salaryView = false;
    private boolean salaryCalculate = false;
    private boolean salaryApprove = false;
    private boolean salaryExport = false;

    // ===== NHÓM NGHỈ PHÉP =====
    private boolean leaveApprove = false;
    private boolean leaveViewAll = false;

    // ===== NHÓM CHẤM CÔNG =====
    private boolean attendanceViewAll = false;
    private boolean attendanceEdit = false;

    // ===== NHÓM ĐÁNH GIÁ =====
    private boolean reviewViewAll = false;
    private boolean reviewCreate = false;
    private boolean reviewApprove = false;

    // ===== NHÓM OKR =====
    private boolean okrManage = false;

    // ===== NHÓM ONBOARDING =====
    private boolean onboardingManage = false;

    // ===== NHÓM DỰ ÁN =====
    private boolean projectCreate = false;
    private boolean projectDelete = false;
    private boolean projectManageAll = false;
    private boolean projectManageIssues = false;
    private boolean projectManageSprints = false;
    private boolean projectViewDashboard = false;
    private boolean projectExport = false;
    private boolean projectManagePhases = false;
    private boolean projectResourcePlanning = false;

    // ===== NHÓM TIME TRACKING =====
    private boolean timetrackingLog = false;
    private boolean timetrackingViewAll = false;

    // ===== NHÓM ANALYTICS =====
    private boolean analyticsView = false;

    // ===== NHÓM CALENDAR =====
    private boolean calendarView = false;
    private boolean calendarManage = false;

    // ===== NHÓM CHAT =====
    private boolean chatCreateGroup = true;
    private boolean chatSendMessage = true;
    private boolean chatShareFile = true;

    // ===== NHÓM LƯU TRỮ =====
    private boolean storageUpload = true;
    private boolean storageDelete = true;
    private boolean storageShare = true;
    private boolean storageManageFolders = true;
    private long storageLimit = 104_857_600L;

    // ===== NHÓM AI =====
    private boolean aiChat = false;
    private boolean aiCreateIssues = false;

    /**
     * Tạo bộ quyền mặc định theo vai trò.
     * Thay thế RoleTemplateService — inline logic đơn giản.
     */
    public static UserPermissions defaultFor(CompanyRole role) {
        UserPermissions p = new UserPermissions();
        if (role == CompanyRole.OWNER || role == CompanyRole.COMPANY_ADMIN) {
            // Full quyền cho Owner và Admin
            // HR
            p.setHrViewList(true);
            p.setHrEditProfile(true);
            p.setHrCreateEmployee(true);
            p.setHrDeleteEmployee(true);
            p.setHrManageContracts(true);
            p.setHrManageReviews(true);
            p.setHrViewDepartments(true);
            p.setHrManageDepartments(true);
            p.setHrViewPositions(true);
            p.setHrManagePositions(true);
            p.setHrViewDashboard(true);
            p.setHrExport(true);
            // Contract
            p.setContractView(true);
            p.setContractCreate(true);
            p.setContractEdit(true);
            p.setContractDelete(true);
            p.setContractRenew(true);
            // Salary
            p.setSalaryView(true);
            p.setSalaryCalculate(true);
            p.setSalaryApprove(true);
            p.setSalaryExport(true);
            // Leave
            p.setLeaveApprove(true);
            p.setLeaveViewAll(true);
            // Attendance
            p.setAttendanceViewAll(true);
            p.setAttendanceEdit(true);
            // Review
            p.setReviewViewAll(true);
            p.setReviewCreate(true);
            p.setReviewApprove(true);
            // OKR
            p.setOkrManage(true);
            // Onboarding
            p.setOnboardingManage(true);
            // Project
            p.setProjectCreate(true);
            p.setProjectManageAll(true);
            p.setProjectDelete(true);
            p.setProjectManageIssues(true);
            p.setProjectManageSprints(true);
            p.setProjectViewDashboard(true);
            p.setProjectExport(true);
            p.setProjectManagePhases(true);
            p.setProjectResourcePlanning(true);
            // Time Tracking
            p.setTimetrackingLog(true);
            p.setTimetrackingViewAll(true);
            // Analytics
            p.setAnalyticsView(true);
            // Calendar
            p.setCalendarView(true);
            p.setCalendarManage(true);
            // Chat
            p.setChatCreateGroup(true);
            p.setChatSendMessage(true);
            p.setChatShareFile(true);
            // Storage
            p.setStorageUpload(true);
            p.setStorageDelete(true);
            p.setStorageShare(true);
            p.setStorageManageFolders(true);
            p.setStorageLimit(10L * 1024 * 1024 * 1024); // 10GB
            // AI
            p.setAiChat(true);
            p.setAiCreateIssues(true);
        } else {
            // EMPLOYEE — quyền cơ bản
            p.setChatSendMessage(true);
            p.setChatCreateGroup(true);
            p.setChatShareFile(true);
            p.setStorageUpload(true);
            p.setStorageDelete(true);
            p.setStorageShare(true);
            p.setStorageManageFolders(true);
            p.setStorageLimit(100 * 1024 * 1024L); // 100MB
            p.setTimetrackingLog(true);
            p.setCalendarView(true);
        }
        return p;
    }

    // Clone method để tạo bản sao từ template
    public UserPermissions clone() {
        UserPermissions copy = new UserPermissions();
        // HR
        copy.hrViewList = this.hrViewList;
        copy.hrEditProfile = this.hrEditProfile;
        copy.hrCreateEmployee = this.hrCreateEmployee;
        copy.hrDeleteEmployee = this.hrDeleteEmployee;
        copy.hrManageContracts = this.hrManageContracts;
        copy.hrManageReviews = this.hrManageReviews;
        copy.hrViewDepartments = this.hrViewDepartments;
        copy.hrManageDepartments = this.hrManageDepartments;
        copy.hrViewPositions = this.hrViewPositions;
        copy.hrManagePositions = this.hrManagePositions;
        copy.hrViewDashboard = this.hrViewDashboard;
        copy.hrExport = this.hrExport;
        // Contract
        copy.contractView = this.contractView;
        copy.contractCreate = this.contractCreate;
        copy.contractEdit = this.contractEdit;
        copy.contractDelete = this.contractDelete;
        copy.contractRenew = this.contractRenew;
        // Salary
        copy.salaryView = this.salaryView;
        copy.salaryCalculate = this.salaryCalculate;
        copy.salaryApprove = this.salaryApprove;
        copy.salaryExport = this.salaryExport;
        // Leave
        copy.leaveApprove = this.leaveApprove;
        copy.leaveViewAll = this.leaveViewAll;
        // Attendance
        copy.attendanceViewAll = this.attendanceViewAll;
        copy.attendanceEdit = this.attendanceEdit;
        // Review
        copy.reviewViewAll = this.reviewViewAll;
        copy.reviewCreate = this.reviewCreate;
        copy.reviewApprove = this.reviewApprove;
        // OKR
        copy.okrManage = this.okrManage;
        // Onboarding
        copy.onboardingManage = this.onboardingManage;
        // Project
        copy.projectCreate = this.projectCreate;
        copy.projectDelete = this.projectDelete;
        copy.projectManageAll = this.projectManageAll;
        copy.projectManageIssues = this.projectManageIssues;
        copy.projectManageSprints = this.projectManageSprints;
        copy.projectViewDashboard = this.projectViewDashboard;
        copy.projectExport = this.projectExport;
        copy.projectManagePhases = this.projectManagePhases;
        copy.projectResourcePlanning = this.projectResourcePlanning;
        // Time Tracking
        copy.timetrackingLog = this.timetrackingLog;
        copy.timetrackingViewAll = this.timetrackingViewAll;
        // Analytics
        copy.analyticsView = this.analyticsView;
        // Calendar
        copy.calendarView = this.calendarView;
        copy.calendarManage = this.calendarManage;
        // Chat
        copy.chatCreateGroup = this.chatCreateGroup;
        copy.chatSendMessage = this.chatSendMessage;
        copy.chatShareFile = this.chatShareFile;
        // Storage
        copy.storageUpload = this.storageUpload;
        copy.storageDelete = this.storageDelete;
        copy.storageShare = this.storageShare;
        copy.storageManageFolders = this.storageManageFolders;
        copy.storageLimit = this.storageLimit;
        // AI
        copy.aiChat = this.aiChat;
        copy.aiCreateIssues = this.aiCreateIssues;
        return copy;
    }

    // ===== MODULE TEMPLATES =====
    // Bật/tắt tất cả sub-permissions cho một module

    public void applyHrTemplate(boolean enabled) {
        this.hrViewList = enabled;
        this.hrEditProfile = enabled;
        this.hrCreateEmployee = enabled;
        this.hrDeleteEmployee = enabled;
        this.hrManageContracts = enabled;
        this.hrManageReviews = enabled;
        this.hrViewDepartments = enabled;
        this.hrManageDepartments = enabled;
        this.hrViewPositions = enabled;
        this.hrManagePositions = enabled;
        this.hrViewDashboard = enabled;
        this.hrExport = enabled;
    }

    public void applyContractTemplate(boolean enabled) {
        this.contractView = enabled;
        this.contractCreate = enabled;
        this.contractEdit = enabled;
        this.contractDelete = enabled;
        this.contractRenew = enabled;
    }

    public void applySalaryTemplate(boolean enabled) {
        this.salaryView = enabled;
        this.salaryCalculate = enabled;
        this.salaryApprove = enabled;
        this.salaryExport = enabled;
    }

    public void applyLeaveTemplate(boolean enabled) {
        this.leaveApprove = enabled;
        this.leaveViewAll = enabled;
    }

    public void applyAttendanceTemplate(boolean enabled) {
        this.attendanceViewAll = enabled;
        this.attendanceEdit = enabled;
    }

    public void applyReviewTemplate(boolean enabled) {
        this.reviewViewAll = enabled;
        this.reviewCreate = enabled;
        this.reviewApprove = enabled;
    }

    public void applyProjectTemplate(boolean enabled) {
        this.projectCreate = enabled;
        this.projectDelete = enabled;
        this.projectManageAll = enabled;
        this.projectManageIssues = enabled;
        this.projectManageSprints = enabled;
        this.projectViewDashboard = enabled;
        this.projectExport = enabled;
        this.projectManagePhases = enabled;
        this.projectResourcePlanning = enabled;
    }

    public void applyTimetrackingTemplate(boolean enabled) {
        this.timetrackingLog = enabled;
        this.timetrackingViewAll = enabled;
    }

    public void applyCalendarTemplate(boolean enabled) {
        this.calendarView = enabled;
        this.calendarManage = enabled;
    }

    public void applyChatTemplate(boolean enabled) {
        this.chatCreateGroup = enabled;
        this.chatSendMessage = enabled;
        this.chatShareFile = enabled;
    }

    public void applyStorageTemplate(boolean enabled) {
        this.storageUpload = enabled;
        this.storageDelete = enabled;
        this.storageShare = enabled;
        this.storageManageFolders = enabled;
    }

    public void applyAiTemplate(boolean enabled) {
        this.aiChat = enabled;
        this.aiCreateIssues = enabled;
    }

    public void applyAnalyticsTemplate(boolean enabled) {
        this.analyticsView = enabled;
    }

    public void applyOkrTemplate(boolean enabled) {
        this.okrManage = enabled;
    }

    public void applyOnboardingTemplate(boolean enabled) {
        this.onboardingManage = enabled;
    }
}
