package DoAn.BE.user.controller;

import DoAn.BE.user.dto.RoleChangeRequestDTO;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.service.RoleChangeRequestService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class RoleChangeRequestController {
    
    private final RoleChangeRequestService roleChangeRequestService;
    
    public RoleChangeRequestController(RoleChangeRequestService roleChangeRequestService) {
        this.roleChangeRequestService = roleChangeRequestService;
    }
    
    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (User) auth.getPrincipal();
    }
    
    /**
     * HR Manager tạo yêu cầu thay đổi role
     * POST /api/hr/role-change-request
     */
    @PostMapping("/hr/role-change-request")
    public ResponseEntity<RoleChangeRequestDTO> createRequest(@Valid @RequestBody RoleChangeRequestDTO request) {
        User currentUser = getCurrentUser();
        RoleChangeRequestDTO result = roleChangeRequestService.createRequest(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }
    
    /**
     * HR Manager xem danh sách yêu cầu của mình
     * GET /api/hr/role-change-request/my
     */
    @GetMapping("/hr/role-change-request/my")
    public ResponseEntity<List<RoleChangeRequestDTO>> getMyRequests() {
        User currentUser = getCurrentUser();
        List<RoleChangeRequestDTO> requests = roleChangeRequestService.getMyRequests(currentUser);
        return ResponseEntity.ok(requests);
    }
    
    /**
     * Admin xem danh sách yêu cầu chờ duyệt
     * GET /api/admin/role-requests
     */
    @GetMapping("/admin/role-requests")
    public ResponseEntity<List<RoleChangeRequestDTO>> getPendingRequests() {
        User currentUser = getCurrentUser();
        List<RoleChangeRequestDTO> requests = roleChangeRequestService.getPendingRequests(currentUser);
        return ResponseEntity.ok(requests);
    }
    
    /**
     * Admin duyệt yêu cầu
     * POST /api/admin/role-requests/{id}/approve
     */
    @PostMapping("/admin/role-requests/{id}/approve")
    public ResponseEntity<RoleChangeRequestDTO> approveRequest(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        User currentUser = getCurrentUser();
        String note = body != null ? body.get("note") : null;
        RoleChangeRequestDTO result = roleChangeRequestService.approveRequest(id, note, currentUser);
        return ResponseEntity.ok(result);
    }
    
    /**
     * Admin từ chối yêu cầu
     * POST /api/admin/role-requests/{id}/reject
     */
    @PostMapping("/admin/role-requests/{id}/reject")
    public ResponseEntity<RoleChangeRequestDTO> rejectRequest(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        User currentUser = getCurrentUser();
        String note = body.get("note");
        RoleChangeRequestDTO result = roleChangeRequestService.rejectRequest(id, note, currentUser);
        return ResponseEntity.ok(result);
    }
}
