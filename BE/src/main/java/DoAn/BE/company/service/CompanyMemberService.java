package DoAn.BE.company.service;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.company.dto.CompanyMemberDto;
import DoAn.BE.company.entity.CompanyMember;
import DoAn.BE.company.entity.CompanyRole;
import DoAn.BE.company.entity.UserPermissions;
import DoAn.BE.company.repository.CompanyMemberRepository;
import DoAn.BE.user.entity.User;

import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.company.constant.PermissionKeys;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;
// Chịu trách nhiệm: Thêm/Xóa/Sửa thành viên và Phân quyền chi tiết
@Service
@RequiredArgsConstructor
@Slf4j
public class CompanyMemberService {

    private final CompanyMemberRepository memberRepository;
    private final RoleTemplateService roleTemplateService;
    private final AccessControlService accessControlService;

    // [Lấy danh sách thành viên của công ty]
    // Quyền: Bất kỳ nhân viên nào trong công ty đều xem được (để chat, assign
    // task...)
    @Transactional(readOnly = true)
    public List<CompanyMemberDto> getMembers(Long companyId) {
        // [Validate input]
        if (companyId == null) {
            throw new BadRequestException("ID công ty không được để trống");
        }

        // [Kiểm tra quyền: Employee trở lên]
        accessControlService.checkPermission(companyId, CompanyRole.EMPLOYEE);

        return memberRepository.findByCompany_CompanyId(companyId)
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    // [Thay đổi vai trò thành viên] (Quan trọng: Role as Template)
    // Khi đổi role -> Sẽ áp dụng bộ quyền mẫu của Role đó cho User.
    // Quyền: Chỉ Admin/Owner công ty
    @Transactional
    public void changeRole(Long companyId, Long targetUserId, CompanyRole newRole) {
        // [Validate input]
        if (companyId == null || targetUserId == null || newRole == null) {
            throw new BadRequestException("Thông tin yêu cầu không đầy đủ");
        }

        // [Authorization: Check quyền Admin của người gọi]
        accessControlService.checkPermission(companyId, CompanyRole.ADMIN);

        CompanyMember targetMember = findActiveMember(targetUserId, companyId);

        // [Business Rule: Không thể đổi role của Owner]
        if (targetMember.hasAnyRole(CompanyRole.OWNER)) {
            throw new ForbiddenException("Không thể thay đổi vai trò của Chủ sở hữu");
        }

        // [Business Rule: Không thể gán role Owner trực tiếp - Phải dùng chức năng
        // Chuyển giao]
        if (newRole == CompanyRole.OWNER) {
            throw new ForbiddenException(
                    "Không thể gán vai trò Chủ sở hữu trực tiếp. Vui lòng dùng chức năng Chuyển quyền sở hữu.");
        }

        // [CORE LOGIC: Cập nhật Role và Reset Quyền theo Template]
        // REFACTOR: Replacing all roles with the new single role
        targetMember.getRoles().clear();
        targetMember.getRoles().add(newRole);

        // Lấy mẫu quyền tương ứng với Set roles mới
        targetMember.setPermissions(roleTemplateService.getTemplate(targetMember.getRoles()));

        memberRepository.save(targetMember);

        log.info("Đã thay đổi role của user {} thành {} trong công ty {} và áp dụng bộ quyền mẫu mới.",
                targetUserId, newRole, companyId);
    }

    // [Xóa thành viên khỏi công ty]
    // Quyền: Chỉ Admin/Owner
    @Transactional
    public void removeMember(Long companyId, Long targetUserId) {
        if (companyId == null || targetUserId == null) {
            throw new BadRequestException("ID công ty và ID thành viên không được để trống");
        }

        accessControlService.checkPermission(companyId, CompanyRole.ADMIN);

        CompanyMember targetMember = findActiveMember(targetUserId, companyId);
        if (targetMember.hasAnyRole(CompanyRole.OWNER)) {
            throw new ForbiddenException("Không thể xóa Chủ sở hữu khỏi công ty");
        }

        memberRepository.delete(targetMember);
        log.info("Đã xóa user {} khỏi công ty {}", targetUserId, companyId);
    }

    // [Rời khỏi công ty]
    // Quyền: Chính chủ (tự rời)
    @Transactional
    public void leaveCompany(Long companyId, User currentUser) {
        if (companyId == null || currentUser == null) {
            throw new BadRequestException("Dữ liệu không hợp lệ");
        }

        CompanyMember member = memberRepository
                .findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(currentUser.getUserId(), companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Bạn không phải là thành viên của công ty này"));

        if (member.hasAnyRole(CompanyRole.OWNER)) {
            throw new ForbiddenException(
                    "Chủ sở hữu không thể rời công ty. Vui lòng chuyển quyền sở hữu hoặc xóa công ty.");
        }

        memberRepository.delete(member);
        log.info("User {} đã rời công ty {}", currentUser.getUserId(), companyId);
    }

    // [Cập nhật quyền hạn chi tiết - Granular Permission]
    // Chức năng này cho phép Admin bật/tắt từng quyền nhỏ lẻ SAU KHI đã gán Role.
    // Quyền: Chỉ Admin/Owner
    @Transactional
    public void updatePermission(Long companyId, Long targetUserId, String permissionKey, boolean enabled) {
        accessControlService.checkPermission(companyId, CompanyRole.ADMIN);

        CompanyMember targetMember = findActiveMember(targetUserId, companyId);
        if (targetMember.hasAnyRole(CompanyRole.OWNER)) {
            throw new ForbiddenException("Không thể sửa quyền hạn của Chủ sở hữu");
        }

        UserPermissions perms = targetMember.getPermissions();
        if (perms == null) {
            // Fallback nếu null: Lấy template hiện tại của Role đang có
            perms = roleTemplateService.getTemplate(targetMember.getRoles());
            targetMember.setPermissions(perms);
        }

        // Update quyền cụ thể (Refactored to match PermissionKeys check)
        setPermissionByString(perms, permissionKey, enabled);
        memberRepository.save(targetMember);

        log.info("Đã cập nhật quyền {} = {} cho user {} trong công ty {}",
                permissionKey, enabled, targetUserId, companyId);
    }

    private CompanyMember findActiveMember(Long userId, Long companyId) {
        return memberRepository
                .findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(userId, companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thành viên"));
    }

    private CompanyMemberDto mapToDto(CompanyMember member) {
        CompanyMemberDto dto = new CompanyMemberDto();
        dto.setUserId(member.getUser().getUserId());
        dto.setFullName(member.getUser().getFullName());
        dto.setEmail(member.getUser().getEmail());
        dto.setAvatarUrl(member.getUser().getAvatarUrl());
        // [Mapping] For now map to primary role
        dto.setRole(member.getRoles().stream().findFirst().orElse(CompanyRole.EMPLOYEE));
        dto.setActive(member.getIsActive());
        dto.setPermissions(member.getPermissions());
        return dto;
    }

    private void setPermissionByString(UserPermissions p, String key, boolean value) {
        switch (key) {
            // [HR GROUP]
            case PermissionKeys.HR_VIEW_LIST -> p.setHrViewList(value);
            case PermissionKeys.HR_EDIT_PROFILE -> p.setHrEditProfile(value);
            case PermissionKeys.HR_MANAGE_CONTRACTS -> p.setHrManageContracts(value);
            case PermissionKeys.HR_MANAGE_REVIEWS -> p.setHrManageReviews(value);

            // [SALARY GROUP]
            case PermissionKeys.SALARY_VIEW -> p.setSalaryView(value);
            case PermissionKeys.SALARY_CALCULATE -> p.setSalaryCalculate(value);
            case PermissionKeys.SALARY_APPROVE -> p.setSalaryApprove(value);

            // [LEAVE GROUP]
            case PermissionKeys.LEAVE_APPROVE -> p.setLeaveApprove(value);
            case PermissionKeys.LEAVE_VIEW_ALL -> p.setLeaveViewAll(value);

            // [ATTENDANCE GROUP]
            case PermissionKeys.ATTENDANCE_VIEW_ALL -> p.setAttendanceViewAll(value);
            case PermissionKeys.ATTENDANCE_EDIT -> p.setAttendanceEdit(value);

            // [PROJECT GROUP]
            case PermissionKeys.PROJECT_CREATE -> p.setProjectCreate(value);
            case PermissionKeys.PROJECT_MANAGE_ALL -> p.setProjectManageAll(value);
            case PermissionKeys.PROJECT_DELETE -> p.setProjectDelete(value);

            // [CHAT GROUP]
            case PermissionKeys.CHAT_CREATE_GROUP -> p.setChatCreateGroup(value);

            // [STORAGE GROUP]
            case PermissionKeys.STORAGE_UPLOAD -> p.setStorageUpload(value);

            default -> throw new BadRequestException("Mã quyền không tồn tại: " + key);
        }
    }
}
