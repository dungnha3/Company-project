package DoAn.BE.company.controller;

import DoAn.BE.company.dto.CompanyDto;
import DoAn.BE.company.dto.PlanLimitDto;
import DoAn.BE.company.service.CompanyService;
import DoAn.BE.company.service.CompanyAdminService;
import DoAn.BE.company.service.CompanyMemberService;
import DoAn.BE.common.service.QuotaService;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/companies")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CompanyController {

    private final CompanyService companyService;
    private final CompanyAdminService companyAdminService;
    private final CompanyMemberService memberService;
    private final QuotaService quotaService;

    @GetMapping("/my")
    public ResponseEntity<List<CompanyDto.CompanyResponse>> getMyCompanies(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(companyService.getMyCompanies(user));
    }

    // [Tạo công ty mới]
    @PostMapping("")
    public ResponseEntity<CompanyDto.CompanyResponse> createCompany(
            @RequestBody CompanyDto.CompanyCreateRequest request,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(companyService.createCompany(request, user));
    }

    @GetMapping("/admin/all")
    public ResponseEntity<List<CompanyDto.CompanyResponse>> getAllCompanies(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        if (!user.isSystemAdminAccount()) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(companyAdminService.getAllCompanies());
    }

    @GetMapping("/{companyId}")
    public ResponseEntity<CompanyDto.CompanyResponse> getCompany(@PathVariable Long companyId,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(companyService.getCompanyById(companyId, user));
    }

    // [PLAN LIMITS] Lấy thông tin giới hạn plan
    @GetMapping("/{companyId}/limits")
    public ResponseEntity<PlanLimitDto> getPlanLimits(@PathVariable Long companyId) {
        Long contextCompanyId = DoAn.BE.common.context.TenantContext.getCompanyId();
        if (contextCompanyId == null || !contextCompanyId.equals(companyId)) {
            throw new DoAn.BE.common.exception.ForbiddenException(
                    "Bạn không có quyền xem thông tin plan của công ty này");
        }
        return ResponseEntity.ok(companyService.getPlanLimits(companyId));
    }

    // [QUOTA USAGE] Lấy thông tin sử dụng quota hiện tại với mức cảnh báo
    @GetMapping("/quota")
    public ResponseEntity<?> getQuotaUsage() {
        var usage = quotaService.getQuotaUsageWithLevels();
        if (usage == null) {
            return ResponseEntity.ok(java.util.Map.of("message", "No quota information available"));
        }
        return ResponseEntity.ok(usage);
    }

    // Rời công ty
    @PostMapping("/{companyId}/leave")
    public ResponseEntity<?> leaveCompany(@PathVariable Long companyId, Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        memberService.leaveCompany(companyId, user);
        return ResponseEntity.ok().body(Map.of("message", "Đã rời công ty thành công"));
    }

    @PutMapping("/{companyId}")
    public ResponseEntity<?> updateCompany(@PathVariable Long companyId,
            @RequestBody CompanyDto.CompanyUpdateRequest request) {
        companyService.updateCompany(companyId, request);
        return ResponseEntity.ok().body(Map.of("message", "Cập nhật thông tin công ty thành công"));
    }

    @GetMapping("/{companyId}/settings")
    public ResponseEntity<?> getSettings(@PathVariable Long companyId) {
        Long contextCompanyId = DoAn.BE.common.context.TenantContext.getCompanyId();
        if (contextCompanyId == null || !contextCompanyId.equals(companyId)) {
            throw new DoAn.BE.common.exception.ForbiddenException("Bạn không có quyền xem cài đặt công ty này");
        }
        return ResponseEntity.ok(companyService.getSettingsCached(companyId));
    }

    @PutMapping("/{companyId}/settings")
    public ResponseEntity<?> updateSettings(@PathVariable Long companyId,
            @RequestBody CompanyDto.SettingsUpdateRequest request) {
        companyService.updateSettings(companyId, request);
        return ResponseEntity.ok().body(Map.of("message", "Cập nhật cài đặt thành công"));
    }
    // MOVED TO SysAdminCompanyController
    /*
     * The following endpoints have been moved to /api/sysadmin/companies/*
     * - updateCompanyByAdmin
     * - changePlan
     * - toggleCompanyStatus
     * - deleteCompany
     * - updateSettingsByAdmin
     */
}
