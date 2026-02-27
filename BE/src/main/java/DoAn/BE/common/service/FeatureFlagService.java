package DoAn.BE.common.service;

import DoAn.BE.common.context.TenantContext;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.company.entity.CompanySettings;
import DoAn.BE.company.repository.CompanySettingsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
@Service
@RequiredArgsConstructor
@Slf4j
public class FeatureFlagService {

    private final CompanySettingsRepository settingsRepository;

    // Cache settings per request để tránh N+1 query
    private static final ThreadLocal<CompanySettings> cachedSettings = new ThreadLocal<>();
    private CompanySettings getSettings() {
        // Kiểm tra cache trước
        CompanySettings cached = cachedSettings.get();
        if (cached != null) {
            return cached;
        }

        Long companyId = TenantContext.getCompanyId();
        if (companyId == null) {
            log.warn("Không tìm thấy companyId trong TenantContext");
            return null;
        }

        CompanySettings settings = settingsRepository.findById(companyId).orElse(null);
        cachedSettings.set(settings);
        return settings;
    }

    // Gọi method này ở cuối request để clear cache
    public static void clearCache() {
        cachedSettings.remove();
    }
    public void requireHRModule() {
        CompanySettings settings = getSettings();
        if (settings != null && !settings.isHrModuleEnabled()) {
            throw new ForbiddenException("Module Nhân sự đã bị vô hiệu hóa cho công ty này");
        }
    }
    public void requireSalaryFeature() {
        requireHRModule();
        CompanySettings settings = getSettings();
        if (settings != null && !settings.isSalaryEnabled()) {
            throw new ForbiddenException("Tính năng Quản lý lương đã bị vô hiệu hóa");
        }
    }
    public void requireLeaveFeature() {
        requireHRModule();
        CompanySettings settings = getSettings();
        if (settings != null && !settings.isLeaveEnabled()) {
            throw new ForbiddenException("Tính năng Quản lý nghỉ phép đã bị vô hiệu hóa");
        }
    }
    public void requireContractFeature() {
        requireHRModule();
        CompanySettings settings = getSettings();
        if (settings != null && !settings.isContractEnabled()) {
            throw new ForbiddenException("Tính năng Quản lý hợp đồng đã bị vô hiệu hóa");
        }
    }
    public void requireAttendanceFeature() {
        requireHRModule();
        CompanySettings settings = getSettings();
        if (settings != null && !settings.isAttendanceEnabled()) {
            throw new ForbiddenException("Tính năng Chấm công đã bị vô hiệu hóa");
        }
    }
    public void requireReviewFeature() {
        requireHRModule();
        CompanySettings settings = getSettings();
        if (settings != null && !settings.isReviewEnabled()) {
            throw new ForbiddenException("Tính năng Đánh giá nhân viên đã bị vô hiệu hóa");
        }
    }
    public void requireChatModule() {
        CompanySettings settings = getSettings();
        if (settings != null && !settings.isChatModuleEnabled()) {
            throw new ForbiddenException("Module Chat đã bị vô hiệu hóa cho công ty này");
        }
    }
    public void requireAIModule() {
        CompanySettings settings = getSettings();
        if (settings != null && !settings.isAiModuleEnabled()) {
            throw new ForbiddenException("Module AI đã bị vô hiệu hóa cho công ty này");
        }
    }
    public void requireProjectModule() {
        CompanySettings settings = getSettings();
        if (settings != null && !settings.isProjectModuleEnabled()) {
            throw new ForbiddenException("Module Dự án đã bị vô hiệu hóa cho công ty này");
        }
    }
    public void requireStorageModule() {
        CompanySettings settings = getSettings();
        if (settings != null && !settings.isStorageModuleEnabled()) {
            throw new ForbiddenException("Module Lưu trữ đã bị vô hiệu hóa cho công ty này");
        }
    }
    public int getMaxLeaveDaysPerYear() {
        CompanySettings settings = getSettings();
        if (settings != null && settings.getMaxLeaveDaysPerYear() != null) {
            return settings.getMaxLeaveDaysPerYear();
        }
        return 12; // Mặc định 12 ngày
    }
    public double getAllowedRadius() {
        CompanySettings settings = getSettings();
        if (settings != null && settings.getAllowedRadius() != null) {
            return settings.getAllowedRadius();
        }
        return 100.0; // Mặc định 100m
    }
    public Double getOfficeLatitude() {
        CompanySettings settings = getSettings();
        return settings != null ? settings.getOfficeLatitude() : null;
    }

    public Double getOfficeLongitude() {
        CompanySettings settings = getSettings();
        return settings != null ? settings.getOfficeLongitude() : null;
    }
}
