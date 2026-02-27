package DoAn.BE.company.service;

import org.springframework.stereotype.Service;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.company.entity.Company;
import DoAn.BE.company.entity.Plan;
import DoAn.BE.company.repository.CompanyMemberRepository;
import DoAn.BE.company.repository.CompanyRepository;
import DoAn.BE.project.repository.ProjectRepository;
import DoAn.BE.storage.repository.FileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionService {

    private final CompanyRepository companyRepository;
    private final CompanyMemberRepository companyMemberRepository;
    private final ProjectRepository projectRepository;
    private final FileRepository fileRepository; // Injected

    // [Check] Kiểm tra giới hạn số lượng user
    public void checkUserLimit(Long companyId) {
        Company company = getCompany(companyId);
        long currentUsers = companyMemberRepository.countByCompany_CompanyIdAndIsActiveTrue(companyId);
        Plan plan = company.getPlan();

        // -1 means unlimited (e.g. ENTERPRISE plan)
        if (plan.isUnlimitedUsers()) {
            return;
        }

        if (currentUsers >= plan.getMaxUsers()) {
            throw new BadRequestException(
                    String.format(
                            "[LIMIT_REACHED] Gói %s của bạn chỉ cho phép tối đa %d thành viên. Vui lòng nâng cấp gói cước.",
                            plan.name(), plan.getMaxUsers()));
        }
    }

    // [Check] Kiểm tra giới hạn số lượng dự án
    public void checkProjectLimit(Long companyId) {
        Company company = getCompany(companyId);
        long currentProjects = projectRepository.countByCompany_CompanyId(companyId);
        Plan plan = company.getPlan();

        // -1 means unlimited (e.g. ENTERPRISE plan)
        if (plan.isUnlimitedProjects()) {
            return;
        }

        if (currentProjects >= plan.getMaxProjects()) {
            throw new BadRequestException(
                    String.format(
                            "[LIMIT_REACHED] Gói %s của bạn chỉ cho phép tối đa %d dự án. Vui lòng nâng cấp gói cước.",
                            plan.name(), plan.getMaxProjects()));
        }
    }

    // [Check] Kiểm tra giới hạn dung lượng lưu trữ (Real-time calculation)
    public void checkStorageLimit(Long companyId, long newFileSizeInBytes) {
        Company company = getCompany(companyId);
        Plan plan = company.getPlan();

        // Handle unlimited storage
        if (plan.isUnlimitedStorage()) {
            return; // No limit
        }

        long maxBytes = plan.getMaxStorageBytes();

        // Calculate current usage from DB
        Long currentUsageBytes = fileRepository.sumFileSizeByCompany(companyId);
        if (currentUsageBytes == null) {
            currentUsageBytes = 0L;
        }

        if (currentUsageBytes + newFileSizeInBytes > maxBytes) {
            throw new BadRequestException(
                    String.format(
                            "[LIMIT_REACHED] Dung lượng hiện tại: %s. Bạn không thể upload thêm %s. Gói %s giới hạn %s.",
                            formatSize(currentUsageBytes), formatSize(newFileSizeInBytes), plan.name(),
                            plan.getMaxStorageDisplay()));
        }
    }

    private String formatSize(long size) {
        String[] units = { "B", "KB", "MB", "GB", "TB" };
        int unitIndex = 0;
        double sizeDouble = size;
        while (sizeDouble >= 1024 && unitIndex < units.length - 1) {
            sizeDouble /= 1024;
            unitIndex++;
        }
        return String.format("%.2f %s", sizeDouble, units[unitIndex]);
    }

    // [Check] Kiểm tra quyền truy cập tính năng (Feature Flags)
    public void checkFeatureAccess(Long companyId, String featureName) {
        Company company = getCompany(companyId);
        Plan plan = company.getPlan();

        // Logic kiểm tra feature theo plan (Hardcoded for now)
        if (featureName.equals("PAYROLL") && plan == Plan.FREE) {
            throw new BadRequestException("[UPGRADE_REQUIRED] Tính năng Tính lương chỉ dành cho gói PRO trở lên.");
        }

        if (featureName.equals("GANTT") && plan == Plan.FREE) {
            // Example: Maybe allow basic Gantt, block advanced?
            // throw new BadRequestException("[UPGRADE_REQUIRED] Biểu đồ Gantt chỉ dành cho
            // gói PRO.");
        }
    }

    private Company getCompany(Long companyId) {
        return companyRepository.findById(companyId)
                .orElseThrow(() -> new DoAn.BE.common.exception.ResourceNotFoundException("Company not found"));
    }
}
