package DoAn.BE.company.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
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
    @JsonIgnoreProperties("settings")
    private Company company;

    // ===== Feature toggles removed =====    // ===== Review Cycle Settings =====
    @Column(name = "auto_review_enabled")
    private Boolean autoReviewEnabled = false;

    @Column(name = "review_cycle_type", length = 20)
    private String reviewCycleType = "QUARTERLY"; // QUARTERLY, MONTHLY, MANUAL

    @Column(name = "last_review_auto_create")
    private String lastReviewAutoCreate; // last period auto-created, e.g. "Q1-2026"

    // ===== Storage Integrations =====
    @Column(name = "google_drive_access_token", columnDefinition = "TEXT")
    private String googleDriveAccessToken;

    @Column(name = "google_drive_refresh_token", columnDefinition = "TEXT")
    private String googleDriveRefreshToken;

    @Column(name = "drive_folder_id")
    private String driveFolderId;

    // Helper removed
}
