package DoAn.BE.company.service;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.common.util.SecurityUtil;
import DoAn.BE.company.entity.*;
import DoAn.BE.company.repository.CompanyMemberRepository;
import DoAn.BE.company.repository.CompanyRepository;
import DoAn.BE.company.repository.WorkspaceJoinRequestRepository;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WorkspaceJoinService {

    private final WorkspaceJoinRequestRepository joinRequestRepository;
    private final CompanyRepository companyRepository;
    private final CompanyMemberRepository memberRepository;
    private final AccessControlService accessControlService;

    // ============================================================
    // USER: Gửi yêu cầu xin gia nhập Workspace bằng companyId
    // ============================================================
    @Transactional
    public Map<String, Object> requestToJoin(Long companyId, User currentUser) {
        // Validate workspace tồn tại và đang hoạt động
        Company company = companyRepository.findById(companyId)
                .filter(c -> Boolean.TRUE.equals(c.getIsActive()))
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy Workspace với ID: " + companyId));

        // Check đã là thành viên chưa
        boolean alreadyMember = memberRepository
                .findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(currentUser.getUserId(), companyId)
                .isPresent();
        if (alreadyMember) {
            throw new BadRequestException("Bạn đã là thành viên của Workspace này");
        }

        // Check đã có yêu cầu PENDING chưa
        boolean hasPending = joinRequestRepository
                .existsByCompany_CompanyIdAndUser_UserIdAndStatus(companyId, currentUser.getUserId(), "PENDING");
        if (hasPending) {
            throw new BadRequestException("Bạn đã gửi yêu cầu gia nhập Workspace này, vui lòng chờ Admin duyệt");
        }

        WorkspaceJoinRequest request = new WorkspaceJoinRequest();
        request.setCompany(company);
        request.setUser(currentUser);
        request.setStatus("PENDING");
        joinRequestRepository.save(request);

        log.info("User {} gửi yêu cầu gia nhập Workspace {}", currentUser.getUserId(), companyId);

        return Map.of(
                "message", "Đã gửi yêu cầu gia nhập thành công. Vui lòng chờ Admin duyệt.",
                "companyName", company.getName(),
                "companyId", companyId
        );
    }

    // ============================================================
    // USER: Xem danh sách yêu cầu gia nhập của chính mình
    // ============================================================
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getMyJoinRequests(Long userId) {
        return joinRequestRepository.findByUser_UserId(userId).stream()
                .map(r -> Map.<String, Object>of(
                        "requestId", r.getRequestId(),
                        "companyId", r.getCompany().getCompanyId(),
                        "companyName", r.getCompany().getName(),
                        "status", r.getStatus(),
                        "createdAt", r.getCreatedAt() != null ? r.getCreatedAt().toString() : ""
                ))
                .collect(Collectors.toList());
    }

    // ============================================================
    // ADMIN: Lấy danh sách yêu cầu PENDING của workspace
    // ============================================================
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getPendingRequests(Long companyId) {
        checkManageRequestsPermission(companyId);

        return joinRequestRepository.findByCompany_CompanyIdAndStatus(companyId, "PENDING").stream()
                .map(r -> {
                    User u = r.getUser();
                    return Map.<String, Object>of(
                            "requestId", r.getRequestId(),
                            "userId", u.getUserId(),
                            "fullName", u.getFullName() != null ? u.getFullName() : "",
                            "email", u.getEmail(),
                            "avatarUrl", u.getAvatarUrl() != null ? u.getAvatarUrl() : "",
                            "createdAt", r.getCreatedAt() != null ? r.getCreatedAt().toString() : ""
                    );
                })
                .collect(Collectors.toList());
    }

    // ============================================================
    // ADMIN: Duyệt yêu cầu → thêm user vào Workspace
    // ============================================================
    @Transactional
    public Map<String, Object> approveRequest(Long requestId) {
        WorkspaceJoinRequest request = getAndValidateRequest(requestId);
        checkManageRequestsPermission(request.getCompany().getCompanyId());

        // Thêm user vào Workspace với role EMPLOYEE mặc định
        CompanyMember newMember = new CompanyMember();
        newMember.setCompany(request.getCompany());
        newMember.setUser(request.getUser());
        newMember.getRoles().add(CompanyRole.EMPLOYEE);
        newMember.setPermissions(UserPermissions.defaultFor(CompanyRole.EMPLOYEE));
        newMember.setIsActive(true);
        newMember.setJoinedAt(LocalDateTime.now());
        memberRepository.save(newMember);

        // Cập nhật trạng thái request
        Long reviewerId = SecurityUtil.getCurrentUserId();
        request.setStatus("APPROVED");
        request.setReviewedBy(reviewerId);
        joinRequestRepository.save(request);

        log.info("User {} đã được duyệt gia nhập Workspace {} bởi {}",
                request.getUser().getUserId(), request.getCompany().getCompanyId(), reviewerId);

        return Map.of(
                "message", "Đã duyệt thành công. " + request.getUser().getFullName() + " đã gia nhập Workspace.",
                "userId", request.getUser().getUserId(),
                "companyId", request.getCompany().getCompanyId()
        );
    }

    // ============================================================
    // ADMIN: Từ chối yêu cầu
    // ============================================================
    @Transactional
    public Map<String, Object> rejectRequest(Long requestId) {
        WorkspaceJoinRequest request = getAndValidateRequest(requestId);
        checkManageRequestsPermission(request.getCompany().getCompanyId());

        Long reviewerId = SecurityUtil.getCurrentUserId();
        request.setStatus("REJECTED");
        request.setReviewedBy(reviewerId);
        joinRequestRepository.save(request);

        log.info("Yêu cầu {} bị từ chối bởi {}", requestId, reviewerId);

        return Map.of("message", "Đã từ chối yêu cầu gia nhập.");
    }

    // ============================================================
    // Private helpers
    // ============================================================
    private WorkspaceJoinRequest getAndValidateRequest(Long requestId) {
        WorkspaceJoinRequest request = joinRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu gia nhập"));
        if (!"PENDING".equals(request.getStatus())) {
            throw new BadRequestException("Yêu cầu này đã được xử lý rồi (trạng thái: " + request.getStatus() + ")");
        }
        return request;
    }

    private void checkManageRequestsPermission(Long companyId) {
        CompanyMember member = accessControlService.getCurrentMember();
        if (member == null) throw new ForbiddenException("Không có quyền truy cập");

        boolean isOwnerOrAdmin = member.hasAnyRole(CompanyRole.OWNER) || member.hasAnyRole(CompanyRole.COMPANY_ADMIN);
        boolean hasPermission = member.getPermissions() != null && member.getPermissions().isWorkspaceManageRequests();

        if (!isOwnerOrAdmin && !hasPermission) {
            throw new ForbiddenException("Bạn không có quyền duyệt yêu cầu gia nhập Workspace này");
        }
    }
}
