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

// [Service quản lý công ty] (Role: Admin/Owner)
@Service
@RequiredArgsConstructor
@Slf4j
public class CompanyService {

    private final DoAn.BE.common.service.AccessControlService accessControlService;

    private final CompanyRepository companyRepository;
    private final CompanyMemberRepository companyMemberRepository;
    private final CompanySettingsRepository companySettingsRepository;
    private final DoAn.BE.project.repository.ProjectRepository projectRepository;

    // [Lấy danh sách công ty của user hiện tại] (Role: Authenticated User)
    @Transactional(readOnly = true)
    public List<CompanyDto.CompanyResponse> getMyCompanies(User currentUser) {
        // [Validate input] (Role: Guard)
        if (currentUser == null) {
            throw new BadRequestException("Người dùng không hợp lệ");
        }

        return companyMemberRepository.findByUser_UserIdAndIsActiveTrue(currentUser.getUserId())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // [SAAS] Lấy tất cả công ty trong hệ thống (System Admin only)
    @Transactional(readOnly = true)
    public List<CompanyDto.CompanyResponse> getAllCompanies() {
        return companyRepository.findAll()
                .stream()
                .map(this::mapCompanyToResponse)
                .collect(Collectors.toList());
    }

    // [Helper] Map Company entity trực tiếp sang Response (không qua CompanyMember)
    private CompanyDto.CompanyResponse mapCompanyToResponse(Company company) {
        CompanyDto.CompanyResponse resp = new CompanyDto.CompanyResponse();
        resp.setCompanyId(company.getCompanyId());
        resp.setName(company.getName());
        resp.setLogoUrl(company.getLogoUrl());
        resp.setAddress(company.getAddress());
        resp.setPlan(company.getPlan());
        resp.setRole(null); // Không có role vì không phải CompanyMember context
        resp.setOwner(false);
        resp.setIsActive(company.getIsActive());
        return resp;
    }

    // [Lấy thông tin công ty theo ID] (Role: Company Member)
    @Transactional(readOnly = true)
    public CompanyDto.CompanyResponse getCompanyById(Long companyId, User currentUser) {
        // [Validate input] (Role: Guard)
        if (companyId == null) {
            throw new BadRequestException("ID công ty không được để trống");
        }

        // [Kiểm tra công ty tồn tại] (Role: Validation)
        if (!companyRepository.existsById(companyId)) {
            throw new ResourceNotFoundException("Không tìm thấy công ty");
        }

        // [Kiểm tra quyền truy cập] (Role: Authorization)
        CompanyMember member = companyMemberRepository
                .findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(currentUser.getUserId(), companyId)
                .orElseThrow(() -> new ForbiddenException("Bạn không phải là thành viên của công ty này"));

        return mapToResponse(member);
    }

    // [Lấy cài đặt của công ty] (Role: Company Member)
    // Cache kết quả để giảm tải DB vì method này được gọi RẤT NHIỀU lần (mỗi lần
    // check permission)
    @Transactional(readOnly = true)
    @Cacheable(value = "companySettings", key = "#companyId")
    public CompanySettings getSettingsCached(Long companyId) {
        // [Validate input] (Role: Guard)
        if (companyId == null) {
            throw new BadRequestException("ID công ty không được để trống");
        }
        return companySettingsRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cài đặt cho công ty: " + companyId));
    }

    // [Tạo công ty mới] (Role: Authenticated User)
    @Transactional
    public CompanyDto.CompanyResponse createCompany(CompanyDto.CompanyCreateRequest req, User currentUser) {
        // [Validate input] (Role: Guard)
        if (req.getName() == null || req.getName().isBlank()) {
            throw new BadRequestException("Tên công ty không được để trống");
        }

        // [Tạo company] (Role: Create)
        Company company = new Company();
        company.setName(req.getName());
        company.setDescription(req.getDescription());
        company.setLogoUrl(req.getLogoUrl());
        company.setAddress(req.getAddress());
        company.setPhone(req.getPhone());
        company.setEmail(req.getEmail());
        company.setPlan(Plan.FREE);
        company.setIsActive(true);

        // [Tạo slug] (Role: Logic)
        String normalized = java.text.Normalizer.normalize(req.getName(), java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .toLowerCase()
                .replaceAll("[^a-z0-9\\s]", "")
                .replaceAll("\\s+", "-");
        String slug = normalized + "-" + java.util.UUID.randomUUID().toString().substring(0, 8);
        company.setSlug(slug);

        company = companyRepository.save(company);

        // [Tạo settings mặc định] (Role: Create)
        CompanySettings settings = new CompanySettings();
        settings.setCompany(company);
        // Default settings are false/null, explicitly set generic defaults if needed
        settings.setHrModuleEnabled(true); // Enable core modules by default for better UX
        settings.setProjectModuleEnabled(true);
        settings.setChatModuleEnabled(true);
        settings.setStorageModuleEnabled(true);
        companySettingsRepository.save(settings);

        // [Tạo owner member] (Role: Create)
        CompanyMember owner = new CompanyMember();
        owner.setCompany(company);
        owner.setUser(currentUser);
        owner.setRole(CompanyRole.OWNER);
        owner.setIsActive(true);
        owner.setJoinedAt(java.time.LocalDateTime.now());
        companyMemberRepository.save(owner);

        log.info("User {} đã tạo công ty mới: {}", currentUser.getUsername(), company.getName());

        // Return response with OWNER role
        CompanyDto.CompanyResponse resp = mapToResponse(owner);
        return resp;
    }

    // [Cập nhật thông tin công ty] (Role: Owner only)
    @Transactional
    public Company updateCompany(Long companyId, CompanyDto.CompanyUpdateRequest req) {
        // [Validate input] (Role: Guard)
        if (companyId == null) {
            throw new BadRequestException("ID công ty không được để trống");
        }

        // [Kiểm tra quyền Owner] (Role: Authorization)
        accessControlService.checkPermission(companyId, CompanyRole.OWNER);

        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy công ty"));

        // [Cập nhật các field] (Role: Update)
        updateCompanyFields(company, req);

        log.info("Đã cập nhật thông tin công ty: {}", company.getName());
        return companyRepository.save(company);
    }

    // [Cập nhật cài đặt công ty] (Role: Admin+)
    // Xóa cache khi update để lần gọi sau lấy dữ liệu mới nhất
    @Transactional
    @CacheEvict(value = "companySettings", key = "#companyId")
    public CompanySettings updateSettings(Long companyId, CompanyDto.SettingsUpdateRequest req) {
        // [Validate input] (Role: Guard)
        if (companyId == null) {
            throw new BadRequestException("ID công ty không được để trống");
        }

        // [Kiểm tra quyền Admin] (Role: Authorization)
        accessControlService.checkPermission(companyId, CompanyRole.ADMIN);

        CompanySettings settings = companySettingsRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cài đặt"));

        // [Cập nhật module settings] (Role: Update)
        updateModuleSettings(settings, req);

        // [Cập nhật GPS settings] (Role: Update)
        updateGpsSettings(settings, req);

        log.info("Đã cập nhật cài đặt công ty: {}", companyId);
        return companySettingsRepository.save(settings);
    }

    // ==================== PRIVATE METHODS ====================

    // [Cập nhật fields công ty] (Role: Internal)
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

    // [Cập nhật module settings] (Role: Internal)
    private void updateModuleSettings(CompanySettings settings, CompanyDto.SettingsUpdateRequest req) {
        if (req.getHrModuleEnabled() != null) {
            settings.setHrModuleEnabled(req.getHrModuleEnabled());
        }
        if (req.getProjectModuleEnabled() != null) {
            settings.setProjectModuleEnabled(req.getProjectModuleEnabled());
        }
        if (req.getChatModuleEnabled() != null) {
            settings.setChatModuleEnabled(req.getChatModuleEnabled());
        }
        if (req.getAiModuleEnabled() != null) {
            settings.setAiModuleEnabled(req.getAiModuleEnabled());
        }
        if (req.getStorageModuleEnabled() != null) {
            settings.setStorageModuleEnabled(req.getStorageModuleEnabled());
        }
    }

    // [Cập nhật GPS settings] (Role: Internal)
    private void updateGpsSettings(CompanySettings settings, CompanyDto.SettingsUpdateRequest req) {
        if (req.getOfficeLatitude() != null) {
            settings.setOfficeLatitude(req.getOfficeLatitude());
        }
        if (req.getOfficeLongitude() != null) {
            settings.setOfficeLongitude(req.getOfficeLongitude());
        }
        if (req.getAllowedRadius() != null) {
            settings.setAllowedRadius(req.getAllowedRadius());
        }
    }

    // [Chuyển đổi CompanyMember sang Response] (Role: Internal)
    private CompanyDto.CompanyResponse mapToResponse(CompanyMember member) {
        CompanyDto.CompanyResponse resp = new CompanyDto.CompanyResponse();
        Company company = member.getCompany();
        resp.setCompanyId(company.getCompanyId());
        resp.setName(company.getName());
        resp.setLogoUrl(company.getLogoUrl());
        resp.setAddress(company.getAddress());
        resp.setPlan(company.getPlan());
        resp.setRole(member.getRole().name());
        resp.setOwner(member.getRole() == CompanyRole.OWNER);
        resp.setIsActive(company.getIsActive());
        return resp;
    }

    // [PLAN LIMITS] Lấy thông tin giới hạn plan của company
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

    // ==================== SYSTEM ADMIN METHODS ====================

    // [SAAS] Cập nhật thông tin công ty (System Admin - không cần member check)
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

    // [SAAS] Đổi plan công ty (System Admin only)
    @Transactional
    public Company changePlan(Long companyId, String planName) {
        if (companyId == null) {
            throw new BadRequestException("ID công ty không được để trống");
        }

        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy công ty"));

        try {
            Plan newPlan = Plan.valueOf(planName.toUpperCase());
            Plan oldPlan = company.getPlan();
            company.setPlan(newPlan);
            companyRepository.save(company);
            log.info("[System Admin] Đã đổi plan công ty {} từ {} sang {}",
                    company.getName(), oldPlan, newPlan);
            return company;
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Plan không hợp lệ: " + planName +
                    ". Các plan hợp lệ: FREE, STARTER, PROFESSIONAL, ENTERPRISE");
        }
    }

    // [SAAS] Bật/tắt trạng thái công ty (System Admin only)
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

    // [SAAS] Xóa công ty (System Admin only - Hard Delete)
    @Transactional
    public void deleteCompany(Long companyId) {
        if (companyId == null) {
            throw new BadRequestException("ID công ty không được để trống");
        }

        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy công ty"));

        String companyName = company.getName();

        // Xóa tất cả members trước (batch delete để tránh N+1)
        List<CompanyMember> members = companyMemberRepository.findByCompany_CompanyId(companyId);
        if (!members.isEmpty()) {
            companyMemberRepository.deleteAll(members);
        }

        // Xóa công ty
        companyRepository.delete(company);

        log.info("[System Admin] Đã xóa công ty: {}", companyName);
    }
}
