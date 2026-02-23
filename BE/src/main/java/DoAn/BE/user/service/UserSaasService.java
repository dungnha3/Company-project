package DoAn.BE.user.service;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import DoAn.BE.common.context.TenantContext;
import DoAn.BE.common.event.UserUpdatedEvent;
import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.company.entity.Company;
import DoAn.BE.company.entity.CompanyMember;
import DoAn.BE.company.entity.CompanyRole;
import DoAn.BE.company.repository.CompanyMemberRepository;
import DoAn.BE.company.repository.CompanyRepository;
import DoAn.BE.company.service.RoleTemplateService;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;

import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// Service xử lý các chức năng multi-tenant (SAAS)

// - Truy vấn users theo company

// - Quản lý role trong company

// - System Admin operations
@Service
@Transactional
@Slf4j
@RequiredArgsConstructor
public class UserSaasService {

    private final UserRepository userRepository;
    private final CompanyMemberRepository companyMemberRepository;
    private final CompanyRepository companyRepository;
    private final RoleTemplateService roleTemplateService;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;

    // ==================== QUERY BY COMPANY ====================
    // Lấy users thuộc công ty hiện tại (cho Company Admin)
    public Page<User> getUsersByCurrentCompany(Pageable pageable) {
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null) {
            return Page.empty();
        }
        return companyMemberRepository.findByCompany_CompanyIdAndIsActiveTrue(companyId, pageable)
                .map(CompanyMember::getUser);
    }

    // Lấy users thuộc công ty hiện tại (không phân trang)
    public List<User> getUsersByCurrentCompanyWithoutPaging() {
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null) {
            return Collections.emptyList();
        }
        return companyMemberRepository.findByCompany_CompanyIdAndIsActiveTrue(companyId)
                .stream()
                .map(CompanyMember::getUser)
                .collect(Collectors.toList());
    }

    // Lấy users thuộc một công ty cụ thể (cho System Admin)
    public Page<User> getUsersByCompanyId(Long companyId, Pageable pageable) {
        if (companyId == null) {
            return Page.empty();
        }
        List<User> users = userRepository.findUsersByCompanyIdWithMemberships(companyId);

        // Manual pagination
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), users.size());

        if (start >= users.size()) {
            return new PageImpl<>(Collections.emptyList(), pageable, users.size());
        }

        List<User> pageContent = users.subList(start, end);
        return new PageImpl<>(pageContent, pageable, users.size());
    }

    // ==================== ROLE MANAGEMENT ====================
    // Cập nhật role của user trong một công ty (System Admin only)
    public void updateUserRoleInCompany(Long userId, Long companyId, String roleName, User currentUser) {
        log.info("System Admin {} cập nhật role cho user {} trong công ty {}",
                currentUser.getUsername(), userId, companyId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy user"));

        // Parse role
        CompanyRole newRole;
        try {
            newRole = CompanyRole.valueOf(roleName);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Role không hợp lệ: " + roleName);
        }

        // Không cho phép gán OWNER trực tiếp
        if (newRole == CompanyRole.OWNER) {
            throw new BadRequestException(
                    "Không thể gán vai trò Owner trực tiếp. Sử dụng chức năng Chuyển quyền sở hữu.");
        }

        // Tìm hoặc tạo CompanyMember
        CompanyMember member = companyMemberRepository
                .findByUser_UserIdAndCompany_CompanyId(userId, companyId)
                .orElse(null);

        if (member != null) {
            // Update existing membership
            // [SAAS] Simplification: Reset to single role for now
            String oldRoles = member.getRoles().toString();
            member.getRoles().clear();
            member.getRoles().add(newRole);
            member.setPermissions(roleTemplateService.getTemplate(java.util.Set.of(newRole)));
            companyMemberRepository.save(member);
            log.info("✅ Đã cập nhật role từ {} sang {} cho user {} trong công ty {}",
                    oldRoles, newRole, userId, companyId);
        } else {
            // Create new membership
            Company company = companyRepository.findById(companyId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy công ty"));

            CompanyMember newMember = new CompanyMember();
            newMember.setUser(user);
            newMember.setCompany(company);
            newMember.getRoles().add(newRole);
            newMember.setPermissions(roleTemplateService.getTemplate(java.util.Set.of(newRole)));
            newMember.setJoinedAt(LocalDateTime.now());
            newMember.setIsActive(true);
            companyMemberRepository.save(newMember);
            log.info("✅ Đã tạo CompanyMember mới cho user {} trong công ty {} với role {}",
                    userId, companyId, newRole);
        }

        // Publish event
        if (eventPublisher != null) {
            eventPublisher.publishEvent(new UserUpdatedEvent(this, user, currentUser,
                    UserUpdatedEvent.UpdateType.ROLE_UPDATE));
        }
    }

    // Cập nhật isSystemAdmin cho user (System Admin only)
    public void updateSystemAdminStatus(Long userId, Boolean isSystemAdmin, User currentUser) {
        if (!currentUser.isSystemAdminAccount()) {
            throw new BadRequestException("Chỉ System Admin mới có thể thay đổi quyền System Admin");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy user"));
        user.setIsSystemAdmin(isSystemAdmin);
        userRepository.save(user);

        log.info("System Admin {} đã {} quyền System Admin cho user {}",
                currentUser.getUsername(),
                isSystemAdmin ? "cấp" : "thu hồi",
                user.getUsername());
    }
}
