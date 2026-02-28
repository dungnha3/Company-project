package DoAn.BE.company.service;

import org.springframework.stereotype.Service;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.company.entity.Company;
import DoAn.BE.company.entity.Plan;
import DoAn.BE.company.repository.CompanyRepository;
import DoAn.BE.project.repository.ProjectRepository;
import DoAn.BE.storage.repository.FileRepository;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class SubscriptionService {

    private final CompanyRepository companyRepository;
    private final ProjectRepository projectRepository;
    private final FileRepository fileRepository;
    private final jakarta.persistence.EntityManager entityManager;

    public SubscriptionService(CompanyRepository companyRepository, ProjectRepository projectRepository,
            FileRepository fileRepository, jakarta.persistence.EntityManager entityManager) {
        this.companyRepository = companyRepository;
        this.projectRepository = projectRepository;
        this.fileRepository = fileRepository;
        this.entityManager = entityManager;
    }

    // [Check] Kiểm tra giới hạn số lượng user
    public void checkUserLimit(Long companyId) {
        Company company = getCompany(companyId);

        // Count ALL members (including pending invites) to prevent quota bypass
        Long totalMembersAndInvites = entityManager.createQuery(
                "SELECT COUNT(cm) FROM CompanyMember cm WHERE cm.company.companyId = :companyId", Long.class)
                .setParameter("companyId", companyId)
                .getSingleResult();

        Plan plan = company.getPlan();

        if (plan.isUnlimitedUsers()) {
            return;
        }

        if (totalMembersAndInvites >= plan.getMaxUsers()) {
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

        if (currentProjects >= plan.getMaxProjects()) {
            throw new BadRequestException(
                    String.format(
                            "[LIMIT_REACHED] Gói %s của bạn chỉ cho phép tối đa %d dự án. Vui lòng nâng cấp gói cước.",
                            plan.name(), plan.getMaxProjects()));
        }
    }

    // [Check] Kiểm tra giới hạn dung lượng lưu trữ (Real-time calculation & Lock)
    @org.springframework.transaction.annotation.Transactional
    public void checkStorageLimit(Long companyId, long newFileSizeInBytes) {
        Company company = entityManager.find(Company.class, companyId,
                jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        if (company == null) {
            throw new DoAn.BE.common.exception.ResourceNotFoundException("Company not found");
        }

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

        if (featureName.equals("PAYROLL") && plan == Plan.FREE) {
            throw new BadRequestException("[UPGRADE_REQUIRED] Tính năng Tính lương chỉ dành cho gói PRO trở lên.");
        }
    }

    private Company getCompany(Long companyId) {
        return companyRepository.findById(companyId)
                .orElseThrow(() -> new DoAn.BE.common.exception.ResourceNotFoundException("Company not found"));
    }
}
