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

    private static final long serialVersionUID = 3L;

    // ===== NHÓM HR =====
    private boolean hrViewList = false;
    private boolean hrEditProfile = false;
    private boolean hrCreateEmployee = false;
    private boolean hrDeleteEmployee = false;
    private boolean hrManageReviews = false;

    private boolean hrViewDashboard = false;
    private boolean hrExport = false;

    // ===== NHÓM NGHỈ PHÉP =====
    private boolean leaveApprove = false;
    private boolean leaveViewAll = false;

    // ===== NHÓM ĐÁNH GIÁ =====
    private boolean reviewViewAll = false;
    private boolean reviewCreate = false;
    private boolean reviewApprove = false;

    // ===== NHÓM DỰ ÁN =====
    private boolean projectView = true; // Tất cả thành viên đều có thể xem project
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

    // ===== NHÓM WORKSPACE =====
    private boolean workspaceManageMembers = false; // Mời/xóa thành viên
    private boolean workspaceManageRequests = false; // Duyệt yêu cầu gia nhập


    public static UserPermissions defaultFor(CompanyRole role) {
        UserPermissions p = new UserPermissions();
        if (role == CompanyRole.OWNER || role == CompanyRole.COMPANY_ADMIN) {
            // Full quyền cho Owner và Admin
            // HR
            p.setHrViewList(true);
            p.setHrEditProfile(true);
            p.setHrCreateEmployee(true);
            p.setHrDeleteEmployee(true);
            p.setHrManageReviews(true);

            p.setHrViewDashboard(true);
            p.setHrExport(true);
            // Leave
            p.setLeaveApprove(true);
            p.setLeaveViewAll(true);
            // Review
            p.setReviewViewAll(true);
            p.setReviewCreate(true);
            p.setReviewApprove(true);
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
            // Workspace
            p.setWorkspaceManageMembers(true);
            p.setWorkspaceManageRequests(true);
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
        copy.hrManageReviews = this.hrManageReviews;

        copy.hrViewDashboard = this.hrViewDashboard;
        copy.hrExport = this.hrExport;
        // Leave
        copy.leaveApprove = this.leaveApprove;
        copy.leaveViewAll = this.leaveViewAll;
        // Review
        copy.reviewViewAll = this.reviewViewAll;
        copy.reviewCreate = this.reviewCreate;
        copy.reviewApprove = this.reviewApprove;
        // Project
        copy.projectView = this.projectView;
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
        // Workspace
        copy.workspaceManageMembers = this.workspaceManageMembers;
        copy.workspaceManageRequests = this.workspaceManageRequests;
        return copy;
    }

    // ===== MODULE TEMPLATES =====

    public void applyHrTemplate(boolean enabled) {
        this.hrViewList = enabled;
        this.hrEditProfile = enabled;
        this.hrCreateEmployee = enabled;
        this.hrDeleteEmployee = enabled;
        this.hrManageReviews = enabled;

        this.hrViewDashboard = enabled;
        this.hrExport = enabled;
    }

    public void applyLeaveTemplate(boolean enabled) {
        this.leaveApprove = enabled;
        this.leaveViewAll = enabled;
    }

    public void applyReviewTemplate(boolean enabled) {
        this.reviewViewAll = enabled;
        this.reviewCreate = enabled;
        this.reviewApprove = enabled;
    }

    public void applyProjectTemplate(boolean enabled) {
        this.projectView = enabled; // Luôn true cho tất cả thành viên
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



    public void applyAnalyticsTemplate(boolean enabled) {
        this.analyticsView = enabled;
    }

    public void applyWorkspaceTemplate(boolean enabled) {
        this.workspaceManageMembers = enabled;
        this.workspaceManageRequests = enabled;
    }
}
