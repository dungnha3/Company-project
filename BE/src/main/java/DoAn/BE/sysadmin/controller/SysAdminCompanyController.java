package DoAn.BE.sysadmin.controller;

import DoAn.BE.company.dto.CompanyDto;
import DoAn.BE.company.service.CompanyAdminService;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@RestController
@RequestMapping("/api/sysadmin/companies")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SysAdminCompanyController {

    private final CompanyAdminService companyAdminService;

    @GetMapping
    public ResponseEntity<Page<CompanyDto.CompanyResponse>> getAllCompanies(
            Authentication authentication,
            Pageable pageable) {
        checkSysAdmin(authentication);
        return ResponseEntity.ok(companyAdminService.getAllCompaniesPaged(pageable));
    }

    // [GET] Get single company details
    @GetMapping("/{companyId}")
    public ResponseEntity<CompanyDto.CompanyResponse> getCompanyById(
            @PathVariable Long companyId,
            Authentication authentication) {
        checkSysAdmin(authentication);
        return ResponseEntity.ok(companyAdminService.getCompanyById(companyId));
    }

    // [GET] Get company settings (for Features & Quotas tab)
    @GetMapping("/{companyId}/settings")
    public ResponseEntity<?> getCompanySettings(
            @PathVariable Long companyId,
            Authentication authentication) {
        checkSysAdmin(authentication);
        return ResponseEntity.ok(companyAdminService.getCompanySettings(companyId));
    }

    // [UPDATE] Update basic info
    @PutMapping("/{companyId}")
    public ResponseEntity<?> updateCompany(
            @PathVariable Long companyId,
            @RequestBody CompanyDto.CompanyUpdateRequest request,
            Authentication authentication) {
        checkSysAdmin(authentication);
        companyAdminService.updateCompanyByAdmin(companyId, request);
        return ResponseEntity.ok(Map.of("message", "Company updated successfully"));
    }



    // [ACTION] Toggle Status (Active/Suspend)
    @PutMapping("/{companyId}/status")
    public ResponseEntity<?> toggleStatus(
            @PathVariable Long companyId,
            Authentication authentication) {
        checkSysAdmin(authentication);
        boolean newStatus = companyAdminService.toggleCompanyStatus(companyId);
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
        companyAdminService.deleteCompany(companyId);
        return ResponseEntity.ok(Map.of("message", "Company deleted successfully"));
    }



    private void checkSysAdmin(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        if (!user.isSystemAdminAccount()) {
            throw new DoAn.BE.common.exception.ForbiddenException("Access Denied: System Admin only");
        }
    }
}
