package DoAn.BE.sysadmin.controller;

import DoAn.BE.company.dto.CompanyDto;
import DoAn.BE.company.service.CompanyService;
import DoAn.BE.sysadmin.dto.SysAdminCompanyDto;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sysadmin/companies")
@RequiredArgsConstructor
public class SysAdminCompanyController {

    private final CompanyService companyService;

    // [LIST] List all companies
    @GetMapping
    public ResponseEntity<List<CompanyDto.CompanyResponse>> getAllCompanies(Authentication authentication) {
        checkSysAdmin(authentication);
        return ResponseEntity.ok(companyService.getAllCompanies());
    }

    // [GET] Get single company details
    @GetMapping("/{companyId}")
    public ResponseEntity<CompanyDto.CompanyResponse> getCompanyById(
            @PathVariable Long companyId,
            Authentication authentication) {
        checkSysAdmin(authentication);
        return ResponseEntity.ok(companyService.getCompanyById(companyId));
    }

    // [GET] Get company settings (for Features & Quotas tab)
    @GetMapping("/{companyId}/settings")
    public ResponseEntity<?> getCompanySettings(
            @PathVariable Long companyId,
            Authentication authentication) {
        checkSysAdmin(authentication);
        return ResponseEntity.ok(companyService.getCompanySettings(companyId));
    }

    // [UPDATE] Update basic info
    @PutMapping("/{companyId}")
    public ResponseEntity<?> updateCompany(
            @PathVariable Long companyId,
            @RequestBody CompanyDto.CompanyUpdateRequest request,
            Authentication authentication) {
        checkSysAdmin(authentication);
        companyService.updateCompanyByAdmin(companyId, request);
        return ResponseEntity.ok(Map.of("message", "Company updated successfully"));
    }

    // [ACTION] Change Plan
    @PutMapping("/{companyId}/plan")
    public ResponseEntity<?> changePlan(
            @PathVariable Long companyId,
            @RequestParam String plan,
            Authentication authentication) {
        checkSysAdmin(authentication);
        companyService.changePlan(companyId, plan);
        return ResponseEntity.ok(Map.of("message", "Plan changed successfully"));
    }

    // [ACTION] Toggle Status (Active/Suspend)
    @PutMapping("/{companyId}/status")
    public ResponseEntity<?> toggleStatus(
            @PathVariable Long companyId,
            Authentication authentication) {
        checkSysAdmin(authentication);
        boolean newStatus = companyService.toggleCompanyStatus(companyId);
        return ResponseEntity.ok(Map.of(
                "message", newStatus ? "Company activated" : "Company suspended",
                "isActive", newStatus));
    }

    // [ACTION] Delete Company (Hard Delete)
    @DeleteMapping("/{companyId}")
    public ResponseEntity<?> deleteCompany(
            @PathVariable Long companyId,
            Authentication authentication) {
        checkSysAdmin(authentication);
        companyService.deleteCompany(companyId);
        return ResponseEntity.ok(Map.of("message", "Company deleted successfully"));
    }

    // [GOD MODE] Update Quota
    @PutMapping("/{companyId}/quota")
    public ResponseEntity<?> updateQuota(
            @PathVariable Long companyId,
            @RequestBody SysAdminCompanyDto.QuotaUpdateRequest request,
            Authentication authentication) {
        checkSysAdmin(authentication);
        companyService.updateCompanyQuota(companyId, request);
        return ResponseEntity.ok(Map.of("message", "Company quota updated (Plan overrides applied)"));
    }

    // [GOD MODE] Update Features
    @PutMapping("/{companyId}/features")
    public ResponseEntity<?> updateFeatures(
            @PathVariable Long companyId,
            @RequestBody SysAdminCompanyDto.FeatureOverrideRequest request,
            Authentication authentication) {
        checkSysAdmin(authentication);
        companyService.updateCompanyFeatures(companyId, request);
        return ResponseEntity.ok(Map.of("message", "Company features updated (Plan overrides applied)"));
    }

    // [SETTINGS] Update Settings (Legacy support + generic settings)
    @PutMapping("/{companyId}/settings")
    public ResponseEntity<?> updateSettings(
            @PathVariable Long companyId,
            @RequestBody CompanyDto.SettingsUpdateRequest request,
            Authentication authentication) {
        checkSysAdmin(authentication);
        companyService.updateSettingsBySystemAdmin(companyId, request);
        return ResponseEntity.ok(Map.of("message", "Settings updated successfully"));
    }

    private void checkSysAdmin(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        if (!user.isSystemAdminAccount()) {
            throw new DoAn.BE.common.exception.ForbiddenException("Access Denied: System Admin only");
        }
    }
}
