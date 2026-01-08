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

    // ===== Limits (Giới hạn theo gói dịch vụ) =====
    @Column(name = "max_employees", nullable = false)
    private int maxEmployees = 50;

    @Column(name = "max_projects", nullable = false)
    private int maxProjects = 10;

    @Column(name = "max_storage_bytes", nullable = false)
    private long maxStorageBytes = 1_073_741_824L; // 1GB

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
}
