package DoAn.BE.company.service;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.company.dto.CompanyDto;
import DoAn.BE.company.entity.Company;
import DoAn.BE.company.entity.CompanyMember;
import DoAn.BE.company.entity.CompanySettings;
import DoAn.BE.company.entity.Plan;
import DoAn.BE.company.repository.CompanyMemberRepository;
import DoAn.BE.company.repository.CompanyRepository;
import DoAn.BE.company.repository.CompanySettingsRepository;
import DoAn.BE.sysadmin.dto.SysAdminCompanyDto;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

// SysAdmin-only operations on companies: plan changes, status toggle,
// settings override, quota/feature God Mode, hard delete.
// /
@Service
@RequiredArgsConstructor
@Slf4j
public class CompanyAdminService {

    private final CompanyRepository companyRepository;
    private final CompanyMemberRepository companyMemberRepository;
    private final CompanySettingsRepository companySettingsRepository;
    private final DoAn.BE.project.repository.ProjectRepository projectRepository;
    private final DoAn.BE.hrm.repository.EmployeeRepository employeeRepository;

    @Transactional(readOnly = true)
    public List<CompanyDto.CompanyResponse> getAllCompanies() {
        return companyRepository.findAll()
                .stream()
                .map(this::mapCompanyToResponse)
                .collect(Collectors.toList());
    }
    @Transactional(readOnly = true)
    public Page<CompanyDto.CompanyResponse> getAllCompaniesPaged(Pageable pageable) {
        return companyRepository.findAll(pageable)
                .map(this::mapCompanyToResponse);
    }

    @Transactional(readOnly = true)
    public CompanyDto.CompanyResponse getCompanyById(Long companyId) {
        if (companyId == null) {
            throw new BadRequestException("ID công ty không được để trống");
        }
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy công ty với ID: " + companyId));
        return mapCompanyToResponse(company);
    }

    @Transactional(readOnly = true)
    public CompanySettings getCompanySettings(Long companyId) {
        return companySettingsRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cài đặt cho công ty: " + companyId));
    }

    @Transactional
    public Company updateCompanyByAdmin(Long companyId, CompanyDto.CompanyUpdateRequest req) {
        if (companyId == null) {
            throw new BadRequestException("ID công ty không được để trống");
        }

        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy công ty"));

        updateCompanyFields(company, req);

        log.info("[System Admin] Đã cập nhật thông tin công ty: {}", company.getName());
        return companyRepository.save(company);
    }

    @Transactional
    @CacheEvict(value = "companySettings", key = "#companyId")
    public Company changePlan(Long companyId, String planName) {
        if (companyId == null) {
            throw new BadRequestException("ID công ty không được để trống");
        }

        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy công ty"));

        try {
            Plan newPlan = Plan.valueOf(planName.toUpperCase());
            Plan oldPlan = company.getPlan();

            if (newPlan.isLowerThan(oldPlan)) {
                validateDowngrade(companyId, newPlan);
            }

            company.setPlan(newPlan);
            companyRepository.save(company);

            CompanySettings settings = companySettingsRepository.findById(companyId).orElse(null);
            if (settings != null) {
                settings.initFromPlan(newPlan);
                settings.applyDependencies();
                companySettingsRepository.save(settings);
            }

            log.info("[System Admin] Đã đổi plan công ty {} từ {} sang {}",
                    company.getName(), oldPlan, newPlan);
            return company;
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Plan không hợp lệ: " + planName +
                    ". Các plan hợp lệ: FREE, STARTER, PROFESSIONAL, ENTERPRISE");
        }
    }

    @Transactional
    public boolean toggleCompanyStatus(Long companyId) {
        if (companyId == null) {
            throw new BadRequestException("ID công ty không được để trống");
        }

        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy công ty"));

        boolean newStatus = !Boolean.TRUE.equals(company.getIsActive());
        company.setIsActive(newStatus);
        companyRepository.save(company);

        log.info("[System Admin] Đã {} công ty: {}",
                newStatus ? "kích hoạt" : "tạm ngưng", company.getName());
        return newStatus;
    }

    @Transactional
    public void deleteCompany(Long companyId) {
        if (companyId == null) {
            throw new BadRequestException("ID công ty không được để trống");
        }

        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy công ty"));

        String companyName = company.getName();

        List<CompanyMember> members = companyMemberRepository.findByCompany_CompanyId(companyId);
        if (!members.isEmpty()) {
            companyMemberRepository.deleteAll(members);
        }

        companyRepository.delete(company);
        log.info("[System Admin] Đã xóa công ty: {}", companyName);
    }

    @Transactional
    @CacheEvict(value = "companySettings", key = "#companyId")
    public CompanySettings updateSettingsBySystemAdmin(Long companyId, CompanyDto.SettingsUpdateRequest req) {
        if (companyId == null) {
            throw new BadRequestException("ID công ty không được để trống");
        }

        CompanySettings settings = companySettingsRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cài đặt"));

        updateModuleSettings(settings, req);
        updateGpsSettings(settings, req);

        log.info("[System Admin] Đã cập nhật cài đặt cho công ty: {}", companyId);
        return companySettingsRepository.save(settings);
    }

    @Transactional
    @CacheEvict(value = "companySettings", key = "#companyId")
    public CompanySettings updateCompanyQuota(Long companyId, SysAdminCompanyDto.QuotaUpdateRequest req) {
        CompanySettings settings = companySettingsRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cài đặt cho công ty: " + companyId));

        if (req.getMaxEmployees() != null)
            settings.setMaxEmployees(req.getMaxEmployees());
        if (req.getMaxProjects() != null)
            settings.setMaxProjects(req.getMaxProjects());
        if (req.getMaxStorageBytes() != null)
            settings.setMaxStorageBytes(req.getMaxStorageBytes());
        if (req.getUserStorageQuotaBytes() != null)
            settings.setUserStorageQuotaBytes(req.getUserStorageQuotaBytes());

        log.info("[System Admin] Đã override Quota cho công ty {}", companyId);
        return companySettingsRepository.save(settings);
    }

    @Transactional
    @CacheEvict(value = "companySettings", key = "#companyId")
    public CompanySettings updateCompanyFeatures(Long companyId, SysAdminCompanyDto.FeatureOverrideRequest req) {
        CompanySettings settings = companySettingsRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cài đặt cho công ty: " + companyId));

        if (req.getHrModuleEnabled() != null)
            settings.setHrModuleEnabled(req.getHrModuleEnabled());
        if (req.getProjectModuleEnabled() != null)
            settings.setProjectModuleEnabled(req.getProjectModuleEnabled());
        if (req.getChatModuleEnabled() != null)
            settings.setChatModuleEnabled(req.getChatModuleEnabled());
        if (req.getAiModuleEnabled() != null)
            settings.setAiModuleEnabled(req.getAiModuleEnabled());
        if (req.getStorageModuleEnabled() != null)
            settings.setStorageModuleEnabled(req.getStorageModuleEnabled());

        if (req.getAttendanceEnabled() != null)
            settings.setAttendanceEnabled(req.getAttendanceEnabled());
        if (req.getLeaveEnabled() != null)
            settings.setLeaveEnabled(req.getLeaveEnabled());
        if (req.getSalaryEnabled() != null)
            settings.setSalaryEnabled(req.getSalaryEnabled());
        if (req.getContractEnabled() != null)
            settings.setContractEnabled(req.getContractEnabled());
        if (req.getReviewEnabled() != null)
            settings.setReviewEnabled(req.getReviewEnabled());

        if (req.getOkrEnabled() != null)
            settings.setOkrEnabled(req.getOkrEnabled());
        if (req.getSkillsMatrixEnabled() != null)
            settings.setSkillsMatrixEnabled(req.getSkillsMatrixEnabled());
        if (req.getOnboardingEnabled() != null)
            settings.setOnboardingEnabled(req.getOnboardingEnabled());
        if (req.getResourcePlanningEnabled() != null)
            settings.setResourcePlanningEnabled(req.getResourcePlanningEnabled());
        if (req.getOrgChartEnabled() != null)
            settings.setOrgChartEnabled(req.getOrgChartEnabled());

        if (req.getTimeTrackingEnabled() != null)
            settings.setTimeTrackingEnabled(req.getTimeTrackingEnabled());
        if (req.getAnalyticsEnabled() != null)
            settings.setAnalyticsEnabled(req.getAnalyticsEnabled());
        if (req.getCalendarEnabled() != null)
            settings.setCalendarEnabled(req.getCalendarEnabled());

        log.info("[System Admin] Đã override Features cho công ty {}", companyId);
        return companySettingsRepository.save(settings);
    }

    // --- Private helpers ---

    private CompanyDto.CompanyResponse mapCompanyToResponse(Company company) {
        CompanyDto.CompanyResponse resp = new CompanyDto.CompanyResponse();
        resp.setCompanyId(company.getCompanyId());
        resp.setName(company.getName());
        resp.setLogoUrl(company.getLogoUrl());
        resp.setAddress(company.getAddress());
        resp.setPlan(company.getPlan());
        resp.setRole(null);
        resp.setOwner(false);
        resp.setIsActive(company.getIsActive());
        return resp;
    }

    private void updateCompanyFields(Company company, CompanyDto.CompanyUpdateRequest req) {
        if (req.getName() != null && !req.getName().isBlank()) {
            company.setName(req.getName());
        }
        if (req.getLogoUrl() != null) {
            company.setLogoUrl(req.getLogoUrl());
        }
        if (req.getAddress() != null) {
            company.setAddress(req.getAddress());
        }
    }

    private void updateModuleSettings(CompanySettings settings, CompanyDto.SettingsUpdateRequest req) {
        if (req.getHrModuleEnabled() != null)
            settings.setHrModuleEnabled(req.getHrModuleEnabled());
        if (req.getProjectModuleEnabled() != null)
            settings.setProjectModuleEnabled(req.getProjectModuleEnabled());
        if (req.getChatModuleEnabled() != null)
            settings.setChatModuleEnabled(req.getChatModuleEnabled());
        if (req.getStorageModuleEnabled() != null)
            settings.setStorageModuleEnabled(req.getStorageModuleEnabled());
        if (req.getAiModuleEnabled() != null) {
            Plan plan = settings.getCompany().getPlan();
            if (req.getAiModuleEnabled() && !plan.isApiAccessEnabled()) {
                throw new DoAn.BE.common.exception.ForbiddenException(
                        "Gói " + plan.name() + " không hỗ trợ tính năng AI");
            }
            settings.setAiModuleEnabled(req.getAiModuleEnabled());
        }
    }

    private void updateGpsSettings(CompanySettings settings, CompanyDto.SettingsUpdateRequest req) {
        if (req.getOfficeLatitude() != null)
            settings.setOfficeLatitude(req.getOfficeLatitude());
        if (req.getOfficeLongitude() != null)
            settings.setOfficeLongitude(req.getOfficeLongitude());
        if (req.getAllowedRadius() != null)
            settings.setAllowedRadius(req.getAllowedRadius());
    }

    private void validateDowngrade(Long companyId, Plan newPlan) {
        long employeeCount = employeeRepository.countByCompanyId(companyId);
        long projectCount = projectRepository.countByCompany_CompanyId(companyId);

        StringBuilder errors = new StringBuilder();

        if (!newPlan.isUnlimitedUsers() && employeeCount > newPlan.getMaxUsers()) {
            errors.append(String.format("Nhân viên: %d/%d (vượt %d). ",
                    employeeCount, newPlan.getMaxUsers(), employeeCount - newPlan.getMaxUsers()));
        }

        if (!newPlan.isUnlimitedProjects() && projectCount > newPlan.getMaxProjects()) {
            errors.append(String.format("Dự án: %d/%d (vượt %d). ",
                    projectCount, newPlan.getMaxProjects(), projectCount - newPlan.getMaxProjects()));
        }

        if (errors.length() > 0) {
            throw new BadRequestException("Không thể hạ gói. " + errors.toString() +
                    "Vui lòng giảm số lượng trước khi hạ gói.");
        }
    }
}
