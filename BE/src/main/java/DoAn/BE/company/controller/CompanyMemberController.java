package DoAn.BE.company.controller;

import DoAn.BE.company.dto.CompanyMemberDto;
import DoAn.BE.company.entity.CompanyRole;
import DoAn.BE.company.service.CompanyMemberService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/companies/{companyId}/members")
@RequiredArgsConstructor
public class CompanyMemberController {

    private final CompanyMemberService memberService;

    @GetMapping
    public ResponseEntity<List<CompanyMemberDto>> getMembers(@PathVariable Long companyId) {
        return ResponseEntity.ok(memberService.getMembers(companyId));
    }

    // Thay đổi vai trò
    @PutMapping("/{userId}/role")
    public ResponseEntity<?> changeRole(@PathVariable Long companyId, @PathVariable Long userId,
            @RequestBody Map<String, String> body) {
        String roleStr = body.get("role");
        if (roleStr == null)
            return ResponseEntity.badRequest().body(Map.of("message", "Vai trò là bắt buộc"));

        CompanyRole newRole;
        try {
            newRole = CompanyRole.valueOf(roleStr);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Vai trò không hợp lệ"));
        }

        memberService.changeRole(companyId, userId, newRole);

        return ResponseEntity.ok().body(Map.of("message", "Cập nhật vai trò thành công"));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<?> removeMember(@PathVariable Long companyId, @PathVariable Long userId) {
        memberService.removeMember(companyId, userId);
        return ResponseEntity.ok().body(Map.of("message", "Đã xóa thành viên khỏi công ty"));
    }

    @PutMapping("/{userId}/permissions")
    public ResponseEntity<?> updatePermission(
            @PathVariable Long companyId,
            @PathVariable Long userId,
            @RequestBody Map<String, Object> body) {

        String permissionKey = (String) body.get("permissionKey");
        Boolean enabled = (Boolean) body.get("enabled");

        if (permissionKey == null || enabled == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "permissionKey và enabled là bắt buộc"));
        }

        memberService.updatePermission(companyId, userId, permissionKey, enabled);
        return ResponseEntity.ok().body(Map.of("message", "Cập nhật quyền hạn thành công"));
    }
}
