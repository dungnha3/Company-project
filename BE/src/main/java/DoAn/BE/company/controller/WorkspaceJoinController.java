package DoAn.BE.company.controller;

import DoAn.BE.company.service.WorkspaceJoinService;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/workspaces")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkspaceJoinController {

    private final WorkspaceJoinService joinService;

    // ----------------------------------------------------------------
    // USER: Gửi yêu cầu gia nhập bằng Workspace ID (companyId)
    // POST /api/workspaces/join
    // Body: { "companyId": 123 }
    // ----------------------------------------------------------------
    @PostMapping("/join")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ResponseEntity<?> requestToJoin(
            @RequestBody Map<String, Long> body,
            Authentication authentication) {
        Long companyId = body.get("companyId");
        if (companyId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Thiếu companyId"));
        }
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(joinService.requestToJoin(companyId, user));
    }

    // ----------------------------------------------------------------
    // USER: Xem trạng thái các yêu cầu gia nhập của mình
    // GET /api/workspaces/join/my-requests
    // ----------------------------------------------------------------
    @GetMapping("/join/my-requests")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getMyRequests(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        return ResponseEntity.ok(joinService.getMyJoinRequests(user.getUserId()));
    }

    // ----------------------------------------------------------------
    // ADMIN: Lấy danh sách yêu cầu PENDING của workspace
    // GET /api/workspaces/{companyId}/join-requests
    // ----------------------------------------------------------------
    @GetMapping("/{companyId}/join-requests")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getPendingRequests(@PathVariable Long companyId) {
        return ResponseEntity.ok(joinService.getPendingRequests(companyId));
    }

    // ----------------------------------------------------------------
    // ADMIN: Duyệt yêu cầu gia nhập
    // POST /api/workspaces/join-requests/{requestId}/approve
    // ----------------------------------------------------------------
    @PostMapping("/join-requests/{requestId}/approve")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ResponseEntity<?> approveRequest(@PathVariable Long requestId) {
        return ResponseEntity.ok(joinService.approveRequest(requestId));
    }

    // ----------------------------------------------------------------
    // ADMIN: Từ chối yêu cầu gia nhập
    // POST /api/workspaces/join-requests/{requestId}/reject
    // ----------------------------------------------------------------
    @PostMapping("/join-requests/{requestId}/reject")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ResponseEntity<?> rejectRequest(@PathVariable Long requestId) {
        return ResponseEntity.ok(joinService.rejectRequest(requestId));
    }
}
