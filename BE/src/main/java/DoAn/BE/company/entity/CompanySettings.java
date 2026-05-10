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

    // ===== Feature toggles removed =====    // ===== Storage Integrations =====
    @Column(name = "google_drive_access_token", columnDefinition = "TEXT")
    private String googleDriveAccessToken;

    @Column(name = "google_drive_refresh_token", columnDefinition = "TEXT")
    private String googleDriveRefreshToken;

    @Column(name = "drive_folder_id")
    private String driveFolderId;

    // Helper removed
}
