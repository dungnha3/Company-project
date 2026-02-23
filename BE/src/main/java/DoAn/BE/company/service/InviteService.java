package DoAn.BE.company.service;

import DoAn.BE.common.context.TenantContext;
import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.company.dto.InviteRequest;
import DoAn.BE.company.entity.Company;
import DoAn.BE.company.entity.CompanyMember;
import DoAn.BE.company.entity.CompanyRole;
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

// [Service mời người dùng vào công ty] (Role: Admin/Owner)
// [Service mời người dùng vào công ty] (Role: Admin/Owner)
@Service
@RequiredArgsConstructor
@Slf4j
public class InviteService {

    private final UserRepository userRepository;
    private final CompanyMemberRepository memberRepository;
    private final CompanyRepository companyRepository;
    private final EmailNotificationService emailService;
    private final RoleTemplateService roleTemplateService;
    private final DoAn.BE.common.service.QuotaService quotaService;

    @Value("${app.client.url:http://localhost:3000}")
    private String clientUrl;

    // [Mời người dùng vào công ty] (Role: Admin/Owner)
    @Transactional
    public void inviteUser(InviteRequest request) {
        // [Validate context] (Role: Guard)
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null) {
            throw new BadRequestException("Không tìm thấy thông tin công ty trong ngữ cảnh");
        }

        // [QUOTA CHECK] Kiểm tra giới hạn nhân viên trước khi mời
        quotaService.validateEmployeeQuota();

        // [Validate request] (Role: Guard)
        validateInviteRequest(request);

        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy công ty"));

        Optional<User> existingUser = userRepository.findByEmail(request.getEmail());

        // [Xử lý theo user đã tồn tại hay chưa] (Role: Logic Branch)
        if (existingUser.isPresent()) {
            handleExistingUser(company, existingUser.get(), request.getRole());
        } else {
            handleNewUser(company, request.getEmail(), request.getRole());
        }
    }

    // [Validate request mời] (Role: Internal)
    private void validateInviteRequest(InviteRequest request) {
        if (request.getEmail() == null || !request.getEmail().contains("@")) {
            throw new BadRequestException("Email không hợp lệ");
        }
        if (request.getRole() == null) {
            request.setRole(CompanyRole.EMPLOYEE);
        }
    }

    // [Xử lý mời user đã tồn tại] (Role: Internal)
    private void handleExistingUser(Company company, User user, CompanyRole role) {
        // [Kiểm tra đã là thành viên chưa] (Role: Validation)
        if (memberRepository.existsByUserAndCompany(user, company)) {
            throw new BadRequestException("Người dùng đã là thành viên của công ty");
        }

        // [Tạo membership và kích hoạt ngay] (Role: Create)
        CompanyMember member = new CompanyMember();
        member.setUser(user);
        member.setCompany(company);
        member.getRoles().add(role);
        member.setPermissions(roleTemplateService.getTemplate(java.util.Set.of(role)));
        member.setInvitedAt(LocalDateTime.now());
        member.setIsActive(true);

        memberRepository.save(member);

        // [Gửi email thông báo] (Role: Notification)
        sendExistingUserInviteEmail(user, company, role);
        log.info("📧 Đã mời thành viên cũ: {} vào công ty {}", user.getEmail(), company.getName());
    }

    // [Xử lý mời user mới] (Role: Internal)
    private void handleNewUser(Company company, String email, CompanyRole role) {
        // [Tạo Shadow User (tạm thời)] (Role: Create)
        User newUser = createShadowUser(email);
        userRepository.save(newUser);

        // [Tạo Membership chưa kích hoạt] (Role: Create)
        CompanyMember member = new CompanyMember();
        member.setUser(newUser);
        member.setCompany(company);
        member.getRoles().add(role);
        member.setPermissions(roleTemplateService.getTemplate(java.util.Set.of(role)));
        member.setInvitedAt(LocalDateTime.now());
        member.setIsActive(false);

        memberRepository.save(member);

        // [Gửi email kích hoạt] (Role: Notification)
        sendNewUserInviteEmail(email, company, newUser.getActivationToken());
        log.info("📧 Đã gửi email mời người dùng mới: {}", email);
    }

    // [Tạo Shadow User] (Role: Internal)
    private User createShadowUser(String email) {
        User newUser = new User();
        newUser.setEmail(email);
        newUser.setUsername(email);
        newUser.setPasswordHash("PENDING_ACTIVATION");
        newUser.setStatus(UserStatus.PENDING_ACTIVATION);
        newUser.setActivationToken(UUID.randomUUID().toString());
        newUser.setIsActive(false);
        return newUser;
    }

    // [Gửi email cho user đã tồn tại] (Role: Internal)
    private void sendExistingUserInviteEmail(User user, Company company, CompanyRole role) {
        String subject = "[" + company.getName() + "] Lời mời tham gia công ty";
        String content = String.format(
                "Xin chào %s,\n\nBạn đã được mời tham gia vào công ty %s với vai trò %s.\nTruy cập ngay: %s",
                user.getUsername(), company.getName(), role.name(), clientUrl);
        emailService.sendSimpleEmail(user.getEmail(), subject, content);
    }

    // [Gửi email cho user mới] (Role: Internal)
    private void sendNewUserInviteEmail(String email, Company company, String activationToken) {
        String accessUrl = clientUrl + "/activate?token=" + activationToken;
        String subject = "[" + company.getName() + "] Lời mời tham gia";
        String content = String.format(
                "Xin chào,\n\nBạn đã được mời tham gia công ty %s.\nVui lòng nhấn vào link dưới đây để kích hoạt tài khoản và thiết lập mật khẩu:\n%s",
                company.getName(), accessUrl);
        emailService.sendSimpleEmail(email, subject, content);
    }
}
