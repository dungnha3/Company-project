package DoAn.BE.company.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.company.dto.CompanyDto;
import DoAn.BE.company.dto.PlanLimitDto;
import DoAn.BE.company.entity.Company;
import DoAn.BE.company.entity.CompanyMember;
import DoAn.BE.company.entity.CompanyRole;
import DoAn.BE.company.entity.CompanySettings;
import DoAn.BE.company.entity.Plan;
import DoAn.BE.company.repository.CompanyMemberRepository;
import DoAn.BE.company.repository.CompanyRepository;
import DoAn.BE.company.repository.CompanySettingsRepository;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;

import java.util.List;
import java.util.stream.Collectors;

// Member-facing company operations: CRUD, settings, caching, plan limits.
// SysAdmin operations are in {@link CompanyAdminService}.
// /
@Service
@RequiredArgsConstructor
@Slf4j
public class CompanyService {

    private final DoAn.BE.common.service.AccessControlService accessControlService;
    private final CompanyRepository companyRepository;
    private final CompanyMemberRepository companyMemberRepository;
    private final CompanySettingsRepository companySettingsRepository;
    private final DoAn.BE.project.repository.ProjectRepository projectRepository;

    @Transactional(readOnly = true)
    public List<CompanyDto.CompanyResponse> getMyCompanies(User currentUser) {
        if (currentUser == null) {
            throw new BadRequestException("Người dùng không hợp lệ");
        }

        return companyMemberRepository.findByUser_UserIdAndIsActiveTrue(currentUser.getUserId())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CompanyDto.CompanyResponse getCompanyById(Long companyId, User currentUser) {
        if (companyId == null) {
            throw new BadRequestException("ID công ty không được để trống");
        }
        if (!companyRepository.existsById(companyId)) {
            throw new ResourceNotFoundException("Không tìm thấy công ty");
        }
        CompanyMember member = companyMemberRepository
                .findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(currentUser.getUserId(), companyId)
                .orElseThrow(() -> new ForbiddenException("Bạn không phải là thành viên của công ty này"));

        return mapToResponse(member);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "companySettings", key = "#companyId")
    public CompanySettings getSettingsCached(Long companyId) {
        if (companyId == null) {
            throw new BadRequestException("ID công ty không được để trống");
        }
        return companySettingsRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cài đặt cho công ty: " + companyId));
    }

    @Transactional
    public CompanyDto.CompanyResponse createCompany(CompanyDto.CompanyCreateRequest req, User currentUser) {
        if (req.getName() == null || req.getName().isBlank()) {
            throw new BadRequestException("Tên công ty không được để trống");
        }
        Company company = new Company();
        company.setName(req.getName());
        company.setDescription(req.getDescription());
        company.setLogoUrl(req.getLogoUrl());
        company.setAddress(req.getAddress());
        company.setPhone(req.getPhone());
        company.setEmail(req.getEmail());
        company.setPlan(Plan.FREE);
        company.setIsActive(true);
        String normalized = java.text.Normalizer.normalize(req.getName(), java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .toLowerCase()
                .replaceAll("[^a-z0-9\\s]", "")
                .replaceAll("\\s+", "-");
        String slug;
        int attempts = 0;
        do {
            String suffix = java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 8);
            slug = normalized + "-" + suffix;
            attempts++;
        } while (companyRepository.existsBySlug(slug) && attempts < 5);

        if (companyRepository.existsBySlug(slug)) {
            throw new DoAn.BE.common.exception.BadRequestException("Không thể tạo slug cho công ty. Vui lòng thử lại.");
        }
        company.setSlug(slug);

        company = companyRepository.save(company);
        CompanySettings settings = new CompanySettings();
        settings.setCompany(company);
        settings.initFromPlan(company.getPlan());
        settings.setProjectModuleEnabled(true);
        settings.setChatModuleEnabled(true);
        settings.setStorageModuleEnabled(true);
        companySettingsRepository.save(settings);
        CompanyMember owner = new CompanyMember();
        owner.setCompany(company);
        owner.setUser(currentUser);
        owner.getRoles().add(CompanyRole.OWNER);
        owner.setIsActive(true);
        owner.setJoinedAt(java.time.LocalDateTime.now());
        companyMemberRepository.save(owner);

        log.info("User {} đã tạo công ty mới: {}", currentUser.getUsername(), company.getName());

        return mapToResponse(owner);
    }

    @Transactional
    public Company updateCompany(Long companyId, CompanyDto.CompanyUpdateRequest req) {
        if (companyId == null) {
            throw new BadRequestException("ID công ty không được để trống");
        }
        accessControlService.checkPermission(companyId, CompanyRole.OWNER);

        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy công ty"));
        updateCompanyFields(company, req);

        log.info("Đã cập nhật thông tin công ty: {}", company.getName());
        return companyRepository.save(company);
    }

    @Transactional
    @CacheEvict(value = "companySettings", key = "#companyId")
    public CompanySettings updateSettings(Long companyId, CompanyDto.SettingsUpdateRequest req) {
        if (companyId == null) {
            throw new BadRequestException("ID công ty không được để trống");
        }
        accessControlService.checkPermission(companyId, CompanyRole.ADMIN);

        CompanySettings settings = companySettingsRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cài đặt"));
        updateModuleSettings(settings, req);

        log.info("Đã cập nhật cài đặt công ty: {}", companyId);
        return companySettingsRepository.save(settings);
    }

    @Transactional(readOnly = true)
    public PlanLimitDto getPlanLimits(Long companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy công ty"));

        Plan plan = company.getPlan();
        long currentMembers = companyMemberRepository.countByCompany_CompanyIdAndIsActiveTrue(companyId);
        long currentProjects = projectRepository.countByCompany_CompanyId(companyId);

        int remainingUsers = plan.isUnlimitedUsers() ? -1 : Math.max(0, plan.getMaxUsers() - (int) currentMembers);
        int remainingProjects = plan.isUnlimitedProjects() ? -1
                : Math.max(0, plan.getMaxProjects() - (int) currentProjects);

        return PlanLimitDto.builder()
                .currentPlan(plan)
                .planName(plan.name())
                .maxUsers(plan.getMaxUsers())
                .currentUsers(currentMembers)
                .remainingUsers(remainingUsers)
                .maxProjects(plan.getMaxProjects())
                .currentProjects(currentProjects)
                .remainingProjects(remainingProjects)
                .maxStorageBytes(plan.getMaxStorageBytes())
                .maxStorageDisplay(plan.getMaxStorageDisplay())
                .hrEnabled(plan.isHrModuleEnabled())
                .apiEnabled(plan.isApiAccessEnabled())
                .canAddMember(remainingUsers != 0)
                .canCreateProject(remainingProjects != 0)
                .build();
    }

    private CompanyDto.CompanyResponse mapToResponse(CompanyMember member) {
        CompanyDto.CompanyResponse resp = new CompanyDto.CompanyResponse();
        Company company = member.getCompany();
        resp.setCompanyId(company.getCompanyId());
        resp.setName(company.getName());
        resp.setLogoUrl(company.getLogoUrl());
        resp.setAddress(company.getAddress());
        resp.setPlan(company.getPlan());
        resp.setRole(member.getRoles().stream().findFirst().map(Enum::name).orElse(null));
        resp.setPermissions(member.getPermissions());
        resp.setOwner(member.hasAnyRole(CompanyRole.OWNER));
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
        Plan plan = settings.getCompany().getPlan();

        if (req.getHrModuleEnabled() != null) {
            if (req.getHrModuleEnabled() && !plan.isHrModuleEnabled()) {
                throw new ForbiddenException("Gói " + plan.name() + " không hỗ trợ tính năng HRM");
            }
            settings.setHrModuleEnabled(req.getHrModuleEnabled());
        }
        if (req.getProjectModuleEnabled() != null) {
            settings.setProjectModuleEnabled(req.getProjectModuleEnabled());
        }
        if (req.getChatModuleEnabled() != null) {
            settings.setChatModuleEnabled(req.getChatModuleEnabled());
        }
        if (req.getAiModuleEnabled() != null) {
            if (req.getAiModuleEnabled() && !plan.isApiAccessEnabled()) {
                throw new ForbiddenException("Gói " + plan.name() + " không hỗ trợ tính năng AI");
            }
            settings.setAiModuleEnabled(req.getAiModuleEnabled());
        }
        if (req.getStorageModuleEnabled() != null) {
            settings.setStorageModuleEnabled(req.getStorageModuleEnabled());
        }
    }
}
