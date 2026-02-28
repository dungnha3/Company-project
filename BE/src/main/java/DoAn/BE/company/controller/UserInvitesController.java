package DoAn.BE.company.controller;

import DoAn.BE.common.util.SecurityUtil;
import DoAn.BE.company.entity.CompanyMember;
import DoAn.BE.company.repository.CompanyMemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

// Controller xử lý các lời mời tham gia công ty từ phía người dùng được mời.
// Endpoint: /api/invites
// /
@RestController
@RequestMapping("/api/invites")
@RequiredArgsConstructor
@Slf4j
public class UserInvitesController {

    private final CompanyMemberRepository memberRepository;

    // Lấy danh sách lời mời đang chờ của user hiện tại
    // GET /api/invites/pending
    // /
    @GetMapping("/pending")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getPendingInvites() {
        Long userId = SecurityUtil.getCurrentUserId();

        // Lấy các membership chưa được kích hoạt (pending invites)
        List<CompanyMember> pendingInvites = memberRepository.findByUser_UserIdAndIsActiveFalse(userId);

        // Map sang DTO đơn giản
        List<Map<String, Object>> result = pendingInvites.stream()
                .map(invite -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("inviteId", invite.getId());
                    map.put("companyId", invite.getCompany().getCompanyId());
                    map.put("companyName", invite.getCompany().getName());
                    map.put("companyLogo",
                            invite.getCompany().getLogoUrl() != null ? invite.getCompany().getLogoUrl() : "");
                    map.put("roles", invite.getRoles().stream().map(Enum::name).toList());
                    map.put("invitedAt", invite.getInvitedAt() != null ? invite.getInvitedAt().toString() : "");
                    return map;
                })
                .toList();

        return ResponseEntity.ok(result);
    }

    // Chấp nhận lời mời tham gia công ty
    // POST /api/invites/accept
    // /
    @PostMapping("/accept")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> acceptInvite(@RequestBody Map<String, Long> request) {
        Long inviteId = request.get("inviteId");
        if (inviteId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Thiếu inviteId"));
        }

        Long userId = SecurityUtil.getCurrentUserId();

        // Tìm invite
        CompanyMember invite = memberRepository.findById(inviteId)
                .orElse(null);

        if (invite == null) {
            return ResponseEntity.notFound().build();
        }

        // Kiểm tra invite có thuộc về user hiện tại không
        if (!invite.getUser().getUserId().equals(userId)) {
            return ResponseEntity.status(403).body(Map.of("message", "Không có quyền chấp nhận lời mời này"));
        }

        // Kiểm tra đã kích hoạt chưa
        if (Boolean.TRUE.equals(invite.getIsActive())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Lời mời này đã được chấp nhận trước đó"));
        }

        // Kích hoạt membership
        invite.setIsActive(true);
        invite.setJoinedAt(LocalDateTime.now());
        memberRepository.save(invite);

        log.info("User {} đã chấp nhận lời mời vào công ty {}", userId, invite.getCompany().getName());

        return ResponseEntity.ok(Map.of(
                "message", "Đã chấp nhận lời mời thành công",
                "companyId", invite.getCompany().getCompanyId(),
                "companyName", invite.getCompany().getName()));
    }

    // Từ chối/hủy lời mời
    // DELETE /api/invites/{inviteId}
    // /
    @DeleteMapping("/{inviteId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> declineInvite(@PathVariable Long inviteId) {
        Long userId = SecurityUtil.getCurrentUserId();

        CompanyMember invite = memberRepository.findById(inviteId)
                .orElse(null);

        if (invite == null) {
            return ResponseEntity.notFound().build();
        }

        // Kiểm tra invite có thuộc về user hiện tại không
        if (!invite.getUser().getUserId().equals(userId)) {
            return ResponseEntity.status(403).body(Map.of("message", "Không có quyền từ chối lời mời này"));
        }

        // Xóa invite
        memberRepository.delete(invite);

        log.info("User {} đã từ chối lời mời vào công ty {}", userId, invite.getCompany().getName());

        return ResponseEntity.ok(Map.of("message", "Đã từ chối lời mời"));
    }
}
