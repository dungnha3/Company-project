package DoAn.BE.user.controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.context.TenantContext;
import DoAn.BE.company.entity.CompanyMember;
import DoAn.BE.company.repository.CompanyMemberRepository;
import DoAn.BE.user.dto.RoleChangeRequestDTO;
import DoAn.BE.user.entity.RoleChangeRequest;
import DoAn.BE.user.entity.RoleChangeRequest.RequestStatus;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.RoleChangeRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// [Controller xử lý các endpoint /api/admin] (Role: Admin/Owner)

// Xử lý các yêu cầu quản trị như role-requests
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
public class AdminController {

        private final RoleChangeRequestRepository roleRequestRepository;
        private final CompanyMemberRepository memberRepository;
        private final AccessControlService accessControlService;

        // ==================== ROLE REQUESTS ====================
// [Lấy danh sách yêu cầu thay đổi role đang chờ duyệt] (Role: Admin/Owner)
        @GetMapping("/role-requests")
        public ResponseEntity<List<RoleChangeRequestDTO>> getPendingRoleRequests(
                        @AuthenticationPrincipal User currentUser) {

                log.debug("GET /api/admin/role-requests - User: {}",
                                currentUser != null ? currentUser.getUsername() : "NULL");

                Long companyId = TenantContext.getCompanyId();
                if (companyId == null) {
                        throw new BadRequestException("Missing Company Context");
                }

                accessControlService.checkAdminPermission(currentUser);

                List<RoleChangeRequest> requests = roleRequestRepository.findByCompany_CompanyIdAndStatus(
                                companyId, RequestStatus.PENDING);

                List<RoleChangeRequestDTO> dtos = requests.stream()
                                .map(req -> new RoleChangeRequestDTO(
                                                req.getRequestId(),
                                                req.getUser().getUserId(),
                                                req.getUser().getFullName(),
                                                req.getCurrentRole(),
                                                req.getRequestedRole(),
                                                req.getReason(),
                                                req.getCreatedAt()))
                                .collect(Collectors.toList());

                return ResponseEntity.ok(dtos);
        }

// [Phê duyệt yêu cầu thay đổi role] (Role: Admin/Owner)
        @PostMapping("/role-requests/{id}/approve")
        @Transactional
        public ResponseEntity<Map<String, String>> approveRoleRequest(
                        @PathVariable Long id,
                        @RequestBody(required = false) Map<String, String> request,
                        @AuthenticationPrincipal User currentUser) {

                log.info("APPROVE role request {} by {}", id,
                                currentUser != null ? currentUser.getUsername() : "NULL");

                accessControlService.checkAdminPermission(currentUser);
                String note = request != null ? request.get("note") : null;

                RoleChangeRequest roleRequest = roleRequestRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("Request not found"));

                if (roleRequest.getStatus() != RequestStatus.PENDING) {
                        throw new BadRequestException("Request is not pending");
                }

                // 1. Update request status
                roleRequest.setStatus(RequestStatus.APPROVED);
                roleRequest.setAdminNote(note);
                roleRequest.setUpdatedAt(LocalDateTime.now());
                roleRequestRepository.save(roleRequest);

                // 2. Update user role in company
                CompanyMember member = memberRepository.findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(
                                roleRequest.getUser().getUserId(), roleRequest.getCompany().getCompanyId())
                                .orElseThrow(() -> new ResourceNotFoundException("Member not found"));

                member.setRole(roleRequest.getRequestedRole());
                memberRepository.save(member);

                return ResponseEntity.ok(Map.of("message", "Đã phê duyệt yêu cầu thành công"));
        }

// [Từ chối yêu cầu thay đổi role] (Role: Admin/Owner)
        @PostMapping("/role-requests/{id}/reject")
        @Transactional
        public ResponseEntity<Map<String, String>> rejectRoleRequest(
                        @PathVariable Long id,
                        @RequestBody(required = false) Map<String, String> request,
                        @AuthenticationPrincipal User currentUser) {

                log.info("REJECT role request {} by {}", id,
                                currentUser != null ? currentUser.getUsername() : "NULL");

                accessControlService.checkAdminPermission(currentUser);
                String note = request != null ? request.get("note") : null;

                RoleChangeRequest roleRequest = roleRequestRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("Request not found"));

                if (roleRequest.getStatus() != RequestStatus.PENDING) {
                        throw new BadRequestException("Request is not pending");
                }

                // Update request status
                roleRequest.setStatus(RequestStatus.REJECTED);
                roleRequest.setAdminNote(note);
                roleRequest.setUpdatedAt(LocalDateTime.now());
                roleRequestRepository.save(roleRequest);

                return ResponseEntity.ok(Map.of("message", "Đã từ chối yêu cầu"));
        }
}
