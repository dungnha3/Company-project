package DoAn.BE.company.controller;

import DoAn.BE.company.dto.CompanyDto;
import DoAn.BE.company.service.CompanyService;
import DoAn.BE.company.service.CompanyMemberService; // Fixed import
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/companies")
@RequiredArgsConstructor
public class CompanyController {

    private final CompanyService companyService;
    private final CompanyMemberService memberService; // Injected

    // Lấy danh sách công ty của tôi
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

    // [SAAS] Lấy tất cả công ty trong hệ thống (System Admin only)
    @GetMapping("/admin/all")
    public ResponseEntity<List<CompanyDto.CompanyResponse>> getAllCompanies(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        // Chỉ System Admin mới được xem tất cả công ty
        if (!user.isSystemAdminAccount()) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(companyService.getAllCompanies());
    }

    // Lấy chi tiết công ty
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

    // Cập nhật thông tin công ty
    @PutMapping("/{companyId}")
    public ResponseEntity<?> updateCompany(@PathVariable Long companyId,
            @RequestBody CompanyDto.CompanyUpdateRequest request) {
        companyService.updateCompany(companyId, request);
        return ResponseEntity.ok().body(Map.of("message", "Cập nhật thông tin công ty thành công"));
    }

    // Cập nhật cài đặt module
    @PutMapping("/{companyId}/settings")
    public ResponseEntity<?> updateSettings(@PathVariable Long companyId,
            @RequestBody CompanyDto.SettingsUpdateRequest request) {
        companyService.updateSettings(companyId, request);
        return ResponseEntity.ok().body(Map.of("message", "Cập nhật cài đặt thành công"));
    }

    // ==================== SYSTEM ADMIN ENDPOINTS ====================

    // [SAAS] Cập nhật thông tin công ty (System Admin - không cần là member)
    @PutMapping("/admin/{companyId}")
    public ResponseEntity<?> updateCompanyByAdmin(
            @PathVariable Long companyId,
            @RequestBody CompanyDto.CompanyUpdateRequest request,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        if (!user.isSystemAdminAccount()) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
        }
        companyService.updateCompanyByAdmin(companyId, request);
        return ResponseEntity.ok().body(Map.of("message", "Cập nhật thông tin công ty thành công"));
    }

    // [SAAS] Đổi plan công ty (System Admin only)
    @PutMapping("/admin/{companyId}/plan")
    public ResponseEntity<?> changePlan(
            @PathVariable Long companyId,
            @RequestParam String plan,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        if (!user.isSystemAdminAccount()) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
        }
        companyService.changePlan(companyId, plan);
        return ResponseEntity.ok().body(Map.of("message", "Đổi plan thành công"));
    }

    // [SAAS] Bật/tắt trạng thái công ty (System Admin only)
    @PutMapping("/admin/{companyId}/status")
    public ResponseEntity<?> toggleCompanyStatus(
            @PathVariable Long companyId,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        if (!user.isSystemAdminAccount()) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
        }
        boolean newStatus = companyService.toggleCompanyStatus(companyId);
        return ResponseEntity.ok().body(Map.of(
                "message", newStatus ? "Đã kích hoạt công ty" : "Đã tạm ngưng công ty",
                "isActive", newStatus));
    }

    // [SAAS] Xóa công ty (System Admin only)
    @DeleteMapping("/admin/{companyId}")
    public ResponseEntity<?> deleteCompany(
            @PathVariable Long companyId,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        if (!user.isSystemAdminAccount()) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
        }
        companyService.deleteCompany(companyId);
        return ResponseEntity.ok().body(Map.of("message", "Đã xóa công ty thành công"));
    }
}
