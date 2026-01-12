package DoAn.BE.common.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import DoAn.BE.common.context.TenantContext;
import DoAn.BE.common.exception.QuotaExceededException;
import DoAn.BE.company.entity.CompanySettings;
import DoAn.BE.company.service.CompanyService;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.project.repository.ProjectRepository;
import DoAn.BE.storage.repository.FileRepository;
import lombok.extern.slf4j.Slf4j;

/**
 * Service for validating company quotas before creating new resources.
 * Checks: maxEmployees, maxProjects, maxStorageBytes
 */
@Slf4j
@Service
public class QuotaService {

    @Autowired
    @Lazy
    private CompanyService companyService;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private FileRepository fileRepository;

    /**
     * Validate that creating a new employee won't exceed the company's quota.
     * 
     * @throws QuotaExceededException if quota would be exceeded
     */
    public void validateEmployeeQuota() {
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null)
            return;

        CompanySettings settings = companyService.getSettingsCached(companyId);
        if (settings == null)
            return;

        long currentCount = employeeRepository.countByCompanyId(companyId);
        int maxEmployees = settings.getMaxEmployees();

        if (currentCount >= maxEmployees) {
            log.warn("Company {} exceeded employee quota: {}/{}", companyId, currentCount, maxEmployees);
            throw new QuotaExceededException("EMPLOYEES", currentCount, maxEmployees);
        }
    }

    /**
     * Validate that creating a new project won't exceed the company's quota.
     * 
     * @throws QuotaExceededException if quota would be exceeded
     */
    public void validateProjectQuota() {
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null)
            return;

        CompanySettings settings = companyService.getSettingsCached(companyId);
        if (settings == null)
            return;

        long currentCount = projectRepository.countByCompany_CompanyId(companyId);
        int maxProjects = settings.getMaxProjects();

        if (currentCount >= maxProjects) {
            log.warn("Company {} exceeded project quota: {}/{}", companyId, currentCount, maxProjects);
            throw new QuotaExceededException("PROJECTS", currentCount, maxProjects);
        }
    }

    /**
     * Validate that uploading a file won't exceed the company's storage quota.
     * 
     * @param fileSize size of the file being uploaded in bytes
     * @throws QuotaExceededException if quota would be exceeded
     */
    public void validateStorageQuota(long fileSize) {
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null)
            return;

        CompanySettings settings = companyService.getSettingsCached(companyId);
        if (settings == null)
            return;

        Long currentUsage = fileRepository.sumFileSizeByCompany(companyId);
        if (currentUsage == null)
            currentUsage = 0L;

        long maxStorage = settings.getMaxStorageBytes();

        if (currentUsage + fileSize > maxStorage) {
            log.warn("Company {} exceeded storage quota: {} + {} > {}",
                    companyId, currentUsage, fileSize, maxStorage);
            throw new QuotaExceededException(
                    "STORAGE",
                    currentUsage,
                    maxStorage);
        }
    }

    /**
     * Get remaining storage space in bytes.
     */
    public long getRemainingStorageBytes() {
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null)
            return Long.MAX_VALUE;

        CompanySettings settings = companyService.getSettingsCached(companyId);
        if (settings == null)
            return Long.MAX_VALUE;

        Long currentUsage = fileRepository.sumFileSizeByCompany(companyId);
        if (currentUsage == null)
            currentUsage = 0L;

        return Math.max(0, settings.getMaxStorageBytes() - currentUsage);
    }

    /**
     * Get quota usage summary for a company.
     */
    public QuotaUsage getQuotaUsage() {
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null)
            return null;

        CompanySettings settings = companyService.getSettingsCached(companyId);
        if (settings == null)
            return null;

        long employeeCount = employeeRepository.countByCompanyId(companyId);
        long projectCount = projectRepository.countByCompany_CompanyId(companyId);
        Long storageUsed = fileRepository.sumFileSizeByCompany(companyId);
        if (storageUsed == null)
            storageUsed = 0L;

        return new QuotaUsage(
                employeeCount, settings.getMaxEmployees(),
                projectCount, settings.getMaxProjects(),
                storageUsed, settings.getMaxStorageBytes());
    }

    // [NEW] Get quota usage with warning levels for FE dashboard
    public QuotaUsageWithLevels getQuotaUsageWithLevels() {
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null)
            return null;

        CompanySettings settings = companyService.getSettingsCached(companyId);
        if (settings == null)
            return null;

        long employeeCount = employeeRepository.countByCompanyId(companyId);
        long projectCount = projectRepository.countByCompany_CompanyId(companyId);
        Long storageUsed = fileRepository.sumFileSizeByCompany(companyId);
        if (storageUsed == null)
            storageUsed = 0L;

        return new QuotaUsageWithLevels(
                new QuotaItem("employees", employeeCount, settings.getMaxEmployees()),
                new QuotaItem("projects", projectCount, settings.getMaxProjects()),
                new QuotaItem("storage", storageUsed, settings.getMaxStorageBytes()));
    }

    // Quota warning levels
    public enum QuotaLevel {
        OK, // < 80%
        WARNING, // 80-99%
        CRITICAL // 100%
    }

    // Individual quota item with level
    public record QuotaItem(String name, long used, long max) {
        public QuotaLevel getLevel() {
            if (max <= 0)
                return QuotaLevel.OK; // Unlimited
            double percentage = (double) used / max * 100;
            if (percentage >= 100)
                return QuotaLevel.CRITICAL;
            if (percentage >= 80)
                return QuotaLevel.WARNING;
            return QuotaLevel.OK;
        }

        public int getPercentage() {
            if (max <= 0)
                return 0;
            return (int) Math.min(100, used * 100 / max);
        }
    }

    // Enhanced quota usage with levels
    public record QuotaUsageWithLevels(
            QuotaItem employees,
            QuotaItem projects,
            QuotaItem storage) {
    }

    // Basic quota usage (kept for backward compatibility)
    public record QuotaUsage(
            long employeesUsed, int employeesMax,
            long projectsUsed, int projectsMax,
            long storageUsed, long storageMax) {
    }
}
