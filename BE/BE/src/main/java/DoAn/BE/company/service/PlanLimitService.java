package DoAn.BE.company.service;

import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import DoAn.BE.company.entity.Company;
import DoAn.BE.company.entity.Plan;
import DoAn.BE.company.repository.CompanyMemberRepository;
import DoAn.BE.project.repository.ProjectRepository;

/**
 * Service kiểm tra limits dựa trên Plan của company
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PlanLimitService {

    private final CompanyMemberRepository memberRepository;
    private final ProjectRepository projectRepository;

    /**
     * Kiểm tra có thể thêm thành viên mới không
     */
    public boolean canAddMember(Company company) {
        Plan plan = company.getPlan();
        if (plan.isUnlimitedUsers())
            return true;

        long currentCount = memberRepository.countByCompany_CompanyIdAndIsActiveTrue(company.getCompanyId());
        return currentCount < plan.getMaxUsers();
    }

    /**
     * Kiểm tra có thể tạo project mới không
     */
    public boolean canCreateProject(Company company) {
        Plan plan = company.getPlan();
        if (plan.isUnlimitedProjects())
            return true;

        long currentCount = projectRepository.countByCompany_CompanyId(company.getCompanyId());
        return currentCount < plan.getMaxProjects();
    }

    /**
     * Kiểm tra HR module có enabled không
     */
    public boolean isHREnabled(Company company) {
        return company.getPlan().isHrModuleEnabled();
    }

    /**
     * Kiểm tra API access có enabled không
     */
    public boolean isAPIEnabled(Company company) {
        return company.getPlan().isApiAccessEnabled();
    }

    /**
     * Lấy số slot thành viên còn lại
     * 
     * @return -1 nếu unlimited
     */
    public int getRemainingUserSlots(Company company) {
        Plan plan = company.getPlan();
        if (plan.isUnlimitedUsers())
            return -1;

        long currentCount = memberRepository.countByCompany_CompanyIdAndIsActiveTrue(company.getCompanyId());
        return Math.max(0, plan.getMaxUsers() - (int) currentCount);
    }

    /**
     * Lấy số project còn có thể tạo
     * 
     * @return -1 nếu unlimited
     */
    public int getRemainingProjectSlots(Company company) {
        Plan plan = company.getPlan();
        if (plan.isUnlimitedProjects())
            return -1;

        long currentCount = projectRepository.countByCompany_CompanyId(company.getCompanyId());
        return Math.max(0, plan.getMaxProjects() - (int) currentCount);
    }

    /**
     * Lấy số thành viên hiện tại
     */
    public long getCurrentMemberCount(Long companyId) {
        return memberRepository.countByCompany_CompanyIdAndIsActiveTrue(companyId);
    }

    /**
     * Lấy số project hiện tại
     */
    public long getCurrentProjectCount(Long companyId) {
        return projectRepository.countByCompany_CompanyId(companyId);
    }
}
