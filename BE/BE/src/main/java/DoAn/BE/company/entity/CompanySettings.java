package DoAn.BE.company.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import org.hibernate.annotations.Filter;

import lombok.EqualsAndHashCode;

// Entity lưu cài đặt và cờ tính năng (Feature Flags) cho từng công ty
@Entity
@Table(name = "company_settings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Filter(name = "tenantFilter", condition = "company_id = :companyId")
public class CompanySettings extends DoAn.BE.common.entity.BaseEntity {

    @Id
    @Column(name = "company_id")
    private Long companyId;

    @OneToOne
    @MapsId
    @JoinColumn(name = "company_id")
    private Company company;

    // ===== Feature toggles (Bật/Tắt tính năng) =====
    @Column(name = "hr_module_enabled", nullable = false)
    private boolean hrModuleEnabled = true;

    @Column(name = "project_module_enabled", nullable = false)
    private boolean projectModuleEnabled = true;

    @Column(name = "chat_module_enabled", nullable = false)
    private boolean chatModuleEnabled = true;

    @Column(name = "ai_module_enabled", nullable = false)
    private boolean aiModuleEnabled = false;

    @Column(name = "storage_module_enabled", nullable = false)
    private boolean storageModuleEnabled = true;

    // ===== HR sub-features (Tính năng con của HR) =====
    @Column(name = "attendance_enabled", nullable = false)
    private boolean attendanceEnabled = true;

    @Column(name = "leave_enabled", nullable = false)
    private boolean leaveEnabled = true;

    @Column(name = "salary_enabled", nullable = false)
    private boolean salaryEnabled = true;

    @Column(name = "contract_enabled", nullable = false)
    private boolean contractEnabled = true;

    @Column(name = "review_enabled", nullable = false)
    private boolean reviewEnabled = true;

    // ===== HR Competitive Features (Tính năng cạnh tranh) =====
    @Column(name = "okr_enabled", nullable = false)
    private boolean okrEnabled = true;

    @Column(name = "skills_matrix_enabled", nullable = false)
    private boolean skillsMatrixEnabled = true;

    @Column(name = "onboarding_enabled", nullable = false)
    private boolean onboardingEnabled = true;

    @Column(name = "resource_planning_enabled", nullable = false)
    private boolean resourcePlanningEnabled = true;

    @Column(name = "org_chart_enabled", nullable = false)
    private boolean orgChartEnabled = true;

    // ===== Limits (Giới hạn theo gói dịch vụ) =====
    @Column(name = "max_employees", nullable = false)
    private int maxEmployees = 50;

    @Column(name = "max_projects", nullable = false)
    private int maxProjects = 10;

    @Column(name = "max_storage_bytes", nullable = false)
    private long maxStorageBytes = 1_073_741_824L; // 1GB

    @Column(name = "max_file_upload_bytes", nullable = false)
    private long maxFileUploadBytes = 10_485_760L; // 10MB default

    @Column(name = "webhook_enabled", nullable = false)
    private boolean webhookEnabled = false;

    // ===== GPS settings (Cài đặt định vị văn phòng cho chấm công) =====
    @Column(name = "office_latitude")
    private Double officeLatitude;

    @Column(name = "office_longitude")
    private Double officeLongitude;

    @Column(name = "allowed_radius", nullable = false)
    private Double allowedRadius = 100.0; // mét

    // ===== Quotas Extensions (Mở rộng giới hạn) =====
    @Column(name = "user_storage_quota_bytes")
    private Long userStorageQuotaBytes; // null = dùng mặc định của gói

    @Column(name = "max_leave_days_per_year")
    private Integer maxLeaveDaysPerYear = 12; // mặc định 12 ngày

    // ===== Project sub-features (Tính năng con của Project) =====
    @Column(name = "time_tracking_enabled", nullable = false)
    private boolean timeTrackingEnabled = true;

    @Column(name = "analytics_enabled", nullable = false)
    private boolean analyticsEnabled = true;

    @Column(name = "calendar_enabled", nullable = false)
    private boolean calendarEnabled = true;

    // ===== automationEnabled removed (module deleted) =====

    // ===== Chat sub-features (Tính năng con của Chat) =====
    @Column(name = "chat_reactions_enabled", nullable = false)
    private boolean chatReactionsEnabled = true;

    @Column(name = "chat_file_share_enabled", nullable = false)
    private boolean chatFileShareEnabled = true;

    @Column(name = "chat_threads_enabled", nullable = false)
    private boolean chatThreadsEnabled = true;

    @Column(name = "chat_search_enabled", nullable = false)
    private boolean chatSearchEnabled = true;

    // ===== Helper: Initialize settings from Plan =====
    public void initFromPlan(Plan plan) {
        this.hrModuleEnabled = plan.isHrModuleEnabled();
        this.aiModuleEnabled = plan.isAiModuleEnabled();
        this.webhookEnabled = plan.isWebhookEnabled();
        this.maxEmployees = plan.getMaxUsers();
        this.maxProjects = plan.getMaxProjects();
        this.maxStorageBytes = plan.getMaxStorageBytes();
        this.maxFileUploadBytes = plan.getMaxFileUploadBytes();
    }

    // ===== Helper: Apply feature dependencies =====
    public void applyDependencies() {
        // Salary requires Attendance
        if (this.salaryEnabled && !this.attendanceEnabled) {
            this.attendanceEnabled = true;
        }
        // HR sub-features require HR module
        if (!this.hrModuleEnabled) {
            this.attendanceEnabled = false;
            this.leaveEnabled = false;
            this.salaryEnabled = false;
            this.contractEnabled = false;
            this.reviewEnabled = false;
        }
    }
}
