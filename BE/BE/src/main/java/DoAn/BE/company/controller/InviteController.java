package DoAn.BE.company.controller;

import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.company.dto.InviteRequest;
import DoAn.BE.company.service.InviteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/company/invite")
@RequiredArgsConstructor
public class InviteController {

    private final InviteService inviteService;
    private final AccessControlService accessControlService;

    // Mời người dùng tham gia công ty
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> inviteUser(@Valid @RequestBody InviteRequest request) {
        // Chỉ admin hoặc owner mới được mời
        if (!accessControlService.isOwnerOrAdmin()) {
            return ResponseEntity.status(403).body(
                    Map.of("message", "Từ chối truy cập: Chỉ Quản trị viên/Chủ sở hữu mới có quyền mời thành viên"));
        }

        inviteService.inviteUser(request);
        return ResponseEntity.ok(Map.of("message", "Đã gửi lời mời thành công"));
    }
}
