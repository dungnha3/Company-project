package DoAn.BE.company.controller;

import DoAn.BE.company.dto.CompanyDto;

import DoAn.BE.company.service.CompanyService;
import DoAn.BE.company.service.CompanyAdminService;
import DoAn.BE.company.service.CompanyMemberService;

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
@Transactional
public class CompanyController {

    private final CompanyService companyService;
    private final CompanyAdminService companyAdminService;
    private final CompanyMemberService memberService;


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

    @GetMapping("/{companyId}/settings/review")
    public ResponseEntity<?> getReviewSettings(@PathVariable Long companyId) {
        Long contextCompanyId = DoAn.BE.common.context.TenantContext.getCompanyId();
        if (contextCompanyId == null || !contextCompanyId.equals(companyId)) {
            throw new DoAn.BE.common.exception.ForbiddenException("Bạn không có quyền xem cài đặt công ty này");
        }
        DoAn.BE.company.entity.CompanySettings settings = companyService.getSettingsCached(companyId);
        DoAn.BE.company.dto.ReviewSettingsDTO dto = new DoAn.BE.company.dto.ReviewSettingsDTO();
        // Boolean (nullable) → boolean (primitive): dùng null-safe check tránh NPE
        dto.setAutoReviewEnabled(Boolean.TRUE.equals(settings.getAutoReviewEnabled()));
        dto.setReviewCycleType(settings.getReviewCycleType() != null ? settings.getReviewCycleType() : "QUARTERLY");
        dto.setLastReviewAutoCreate(settings.getLastReviewAutoCreate());
        return ResponseEntity.ok(dto);
    }

    @PutMapping("/{companyId}/settings/review")
    public ResponseEntity<?> updateReviewSettings(
            @PathVariable Long companyId,
            @RequestBody DoAn.BE.company.dto.ReviewSettingsDTO dto) {
        Long contextCompanyId = DoAn.BE.common.context.TenantContext.getCompanyId();
        if (contextCompanyId == null || !contextCompanyId.equals(companyId)) {
            throw new DoAn.BE.common.exception.ForbiddenException("Bạn không có quyền cập nhật cài đặt công ty này");
        }
        companyService.updateReviewSettings(companyId, dto);
        return ResponseEntity.ok(java.util.Map.of("message", "Cập nhật cài đặt review thành công"));
    }


}
