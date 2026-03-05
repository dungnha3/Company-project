package DoAn.BE.company.service;

import DoAn.BE.common.context.TenantContext;
import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.company.dto.InviteRequest;
import DoAn.BE.company.entity.Company;
import DoAn.BE.company.entity.CompanyMember;
import DoAn.BE.company.entity.CompanyRole;
import DoAn.BE.company.entity.UserPermissions;
import DoAn.BE.company.repository.CompanyMemberRepository;
import DoAn.BE.company.repository.CompanyRepository;
import DoAn.BE.notification.service.EmailNotificationService;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.entity.User.UserStatus;
import DoAn.BE.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class InviteService {

    private final UserRepository userRepository;
    private final CompanyMemberRepository memberRepository;
    private final CompanyRepository companyRepository;
    private final EmailNotificationService emailService;
    private final DoAn.BE.common.service.QuotaService quotaService;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Value("${app.client.url:http://localhost:3000}")
    private String clientUrl;

    @Transactional
    public void inviteUser(InviteRequest request) {
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null) {
            throw new BadRequestException("Không tìm thấy thông tin công ty trong ngữ cảnh");
        }

        // [QUOTA CHECK] Kiểm tra giới hạn nhân viên trước khi mời
        quotaService.validateEmployeeQuota();
        validateInviteRequest(request);

        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy công ty"));

        Optional<User> existingUser = userRepository.findByEmail(request.getEmail());
        if (existingUser.isPresent()) {
            handleExistingUser(company, existingUser.get(), request.getRole());
        } else {
            handleNewUser(company, request.getEmail(), request.getRole());
        }
    }

    private void validateInviteRequest(InviteRequest request) {
        if (request.getEmail() == null || !request.getEmail().contains("@")) {
            throw new BadRequestException("Email không hợp lệ");
        }
        if (request.getRole() == null) {
            request.setRole(CompanyRole.EMPLOYEE);
        }
        if (request.getRole() == CompanyRole.OWNER) {
            throw new BadRequestException(
                    "Không thể mời thành viên với vai trò Owner. Sử dụng chức năng chuyển quyền sở hữu.");
        }
        // [PRIVILEGE ESCALATION GUARD] Chỉ OWNER mới được invite COMPANY_ADMIN
        if (request.getRole() == CompanyRole.COMPANY_ADMIN) {
            Long companyId = TenantContext.getCompanyId();
            // Lấy current user từ SecurityContext
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder
                    .getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof DoAn.BE.user.entity.User currentUser) {
                CompanyMember caller = memberRepository.findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(
                        currentUser.getUserId(), companyId)
                        .orElseThrow(() -> new BadRequestException("Không tìm thấy thành viên"));
                if (!caller.hasAnyRole(CompanyRole.OWNER)) {
                    throw new DoAn.BE.common.exception.ForbiddenException(
                            "Chỉ Chủ sở hữu mới có quyền mời Quản trị viên");
                }
            } else {
                throw new DoAn.BE.common.exception.ForbiddenException(
                        "Không xác định được người dùng hiện tại");
            }
        }
    }

    private void handleExistingUser(Company company, User user, CompanyRole role) {
        if (memberRepository.existsByUserAndCompany(user, company)) {
            throw new BadRequestException("Người dùng đã là thành viên của công ty");
        }
        CompanyMember member = new CompanyMember();
        member.setUser(user);
        member.setCompany(company);
        member.getRoles().add(role);
        member.setPermissions(UserPermissions.defaultFor(role));
        member.setInvitedAt(LocalDateTime.now());
        // invite.
        member.setIsActive(false);

        memberRepository.save(member);
        sendExistingUserInviteEmail(user, company, role);
        log.info("Đã mời thành viên cũ: {} vào công ty {}", user.getEmail(), company.getName());
    }

    private void handleNewUser(Company company, String email, CompanyRole role) {
        User newUser = createShadowUser(email);
        userRepository.save(newUser);
        CompanyMember member = new CompanyMember();
        member.setUser(newUser);
        member.setCompany(company);
        member.getRoles().add(role);
        member.setPermissions(UserPermissions.defaultFor(role));
        member.setInvitedAt(LocalDateTime.now());
        member.setIsActive(false);

        memberRepository.save(member);
        sendNewUserInviteEmail(email, company, newUser.getActivationToken());
        log.info("Đã gửi email mời người dùng mới: {}", email);
    }

    private User createShadowUser(String email) {
        User newUser = new User();
        newUser.setEmail(email);
        newUser.setUsername(email);
        newUser.setPasswordHash(passwordEncoder.encode(java.util.UUID.randomUUID().toString()));
        newUser.setStatus(UserStatus.PENDING_ACTIVATION);
        newUser.setActivationToken(UUID.randomUUID().toString());
        newUser.setIsActive(false);
        return newUser;
    }

    private void sendExistingUserInviteEmail(User user, Company company, CompanyRole role) {
        String subject = "[" + company.getName() + "] Lời mời tham gia công ty";
        String content = String.format(
                "Xin chào %s,\n\nBạn đã được mời tham gia vào công ty %s với vai trò %s.\nTruy cập ngay: %s",
                user.getUsername(), company.getName(), role.name(), clientUrl);
        emailService.sendSimpleEmail(user.getEmail(), subject, content);
    }

    private void sendNewUserInviteEmail(String email, Company company, String activationToken) {
        String accessUrl = clientUrl + "/activate?token=" + activationToken;
        String subject = "[" + company.getName() + "] Lời mời tham gia";
        String content = String.format(
                "Xin chào,\n\nBạn đã được mời tham gia công ty %s.\nVui lòng nhấn vào link dưới đây để kích hoạt tài khoản và thiết lập mật khẩu:\n%s",
                company.getName(), accessUrl);
        emailService.sendSimpleEmail(email, subject, content);
    }
}
