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
        if (settings == null || !settings.isHrModuleEnabled()) {
            throw new ForbiddenException("Module Nhân sự đã bị vô hiệu hóa cho công ty này");
        }
    }

    public void requireLeaveFeature() {
        requireHRModule();
        CompanySettings settings = getSettings();
        if (settings == null || !settings.isLeaveEnabled()) {
            throw new ForbiddenException("Tính năng Quản lý nghỉ phép đã bị vô hiệu hóa");
        }
    }

    public void requireReviewFeature() {
        requireHRModule();
        CompanySettings settings = getSettings();
        if (settings == null || !settings.isReviewEnabled()) {
            throw new ForbiddenException("Tính năng Đánh giá nhân viên đã bị vô hiệu hóa");
        }
    }

    public void requireChatModule() {
        // Always enabled
    }

    public void requireAIModule() {
        // Always enabled
    }

    public void requireProjectModule() {
        CompanySettings settings = getSettings();
        if (settings != null && !settings.isProjectModuleEnabled()) {
            throw new ForbiddenException("Module Dự án đã bị vô hiệu hóa cho công ty này");
        }
    }

    public void requireStorageModule() {
        // Always enabled
    }
}
