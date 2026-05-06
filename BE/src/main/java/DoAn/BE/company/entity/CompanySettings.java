package DoAn.BE.company.entity;

import jakarta.persistence.*;
import lombok.*;

import org.hibernate.annotations.Filter;

// Entity lưu cài đặt và cờ tính năng (Feature Flags) cho từng công ty
@Entity
@Table(name = "company_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = false)
@Filter(name = "tenantFilter", condition = "company_id = :companyId")
public class CompanySettings extends DoAn.BE.common.entity.BaseEntity {

    @Id
    @Column(name = "company_id")
    @EqualsAndHashCode.Include
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



    // ===== HR sub-features =====
    @Column(name = "leave_enabled", nullable = false)
    private boolean leaveEnabled = true;

    @Column(name = "review_enabled", nullable = false)
    private boolean reviewEnabled = true;

    @Column(name = "resource_planning_enabled", nullable = false)
    private boolean resourcePlanningEnabled = true;




    // ===== Project sub-features =====
    @Column(name = "time_tracking_enabled", nullable = false)
    private boolean timeTrackingEnabled = true;

    @Column(name = "analytics_enabled", nullable = false)
    private boolean analyticsEnabled = true;

    @Column(name = "calendar_enabled", nullable = false)
    private boolean calendarEnabled = true;



    // ===== Storage Integrations =====
    @Column(name = "google_drive_access_token", columnDefinition = "TEXT")
    private String googleDriveAccessToken;

    @Column(name = "google_drive_refresh_token", columnDefinition = "TEXT")
    private String googleDriveRefreshToken;

    @Column(name = "drive_folder_id")
    private String driveFolderId;

    // ===== Helper: Apply feature dependencies =====
    public void applyDependencies() {
        // HR sub-features require HR module
        if (!this.hrModuleEnabled) {
            this.leaveEnabled = false;
            this.reviewEnabled = false;
        }
    }
}
