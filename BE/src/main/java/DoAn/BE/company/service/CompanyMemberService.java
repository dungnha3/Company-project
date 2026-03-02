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
        accessControlService.checkPermission(companyId, CompanyRole.COMPANY_ADMIN);

        CompanyMember targetMember = findActiveMember(targetUserId, companyId);

        // [Business Rule: Không thể đổi role của Owner]
        if (targetMember.hasAnyRole(CompanyRole.OWNER)) {
            throw new ForbiddenException("Không thể thay đổi vai trò của Chủ sở hữu");
        }
        if (targetMember.hasAnyRole(CompanyRole.COMPANY_ADMIN)) {
            CompanyMember currentMember = accessControlService.getCurrentMember();
            if (currentMember == null || !currentMember.hasAnyRole(CompanyRole.OWNER)) {
                throw new ForbiddenException("Chỉ Chủ sở hữu mới có quyền thay đổi vai trò của Quản trị viên");
            }
        }

        // [Business Rule: Không thể gán role Owner trực tiếp - Phải dùng chức năng
        // Chuyển giao]
        if (newRole == CompanyRole.OWNER) {
            throw new ForbiddenException(
                    "Không thể gán vai trò Chủ sở hữu trực tiếp. Vui lòng dùng chức năng Chuyển quyền sở hữu.");
        }

        // [PRIVILEGE ESCALATION GUARD] Chỉ OWNER mới gán được COMPANY_ADMIN
        if (newRole == CompanyRole.COMPANY_ADMIN) {
            CompanyMember currentMember = accessControlService.getCurrentMember();
            if (currentMember == null || !currentMember.hasAnyRole(CompanyRole.OWNER)) {
                throw new ForbiddenException("Chỉ Chủ sở hữu mới có quyền gán vai trò Quản trị viên");
            }
        }

        // [CORE LOGIC: Cập nhật Role và Reset Quyền theo Template]
        // REFACTOR: Replacing all roles with the new single role
        targetMember.getRoles().clear();
        targetMember.getRoles().add(newRole);

        // Lấy mẫu quyền tương ứng với Set roles mới
        targetMember.setPermissions(UserPermissions.defaultFor(newRole));

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

        accessControlService.checkPermission(companyId, CompanyRole.COMPANY_ADMIN);

        CompanyMember targetMember = findActiveMember(targetUserId, companyId);
        if (targetMember.hasAnyRole(CompanyRole.OWNER)) {
            throw new ForbiddenException("Không thể xóa Chủ sở hữu khỏi công ty");
        }
        if (targetMember.hasAnyRole(CompanyRole.COMPANY_ADMIN)) {
            // Check if current user is OWNER
            DoAn.BE.company.entity.CompanyMember currentMember = accessControlService.getCurrentMember();
            if (currentMember == null || !currentMember.hasAnyRole(CompanyRole.OWNER)) {
                throw new ForbiddenException("Chỉ chủ sở hữu mới có thể xóa Admin");
            }
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
        accessControlService.checkPermission(companyId, CompanyRole.COMPANY_ADMIN);

        CompanyMember targetMember = findActiveMember(targetUserId, companyId);
        if (targetMember.hasAnyRole(CompanyRole.OWNER)) {
            throw new ForbiddenException("Không thể sửa quyền hạn của Chủ sở hữu");
        }

        UserPermissions perms = targetMember.getPermissions();
        if (perms == null) {
            // Fallback nếu null: Lấy template hiện tại của Role đang có
            CompanyRole primaryRole = targetMember.getRoles().stream().findFirst().orElse(CompanyRole.EMPLOYEE);
            perms = UserPermissions.defaultFor(primaryRole);
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
            // HR
            case PermissionKeys.HR_VIEW_LIST -> p.setHrViewList(value);
            case PermissionKeys.HR_EDIT_PROFILE -> p.setHrEditProfile(value);
            case PermissionKeys.HR_CREATE_EMPLOYEE -> p.setHrCreateEmployee(value);
            case PermissionKeys.HR_DELETE_EMPLOYEE -> p.setHrDeleteEmployee(value);
            case PermissionKeys.HR_MANAGE_CONTRACTS -> p.setHrManageContracts(value);
            case PermissionKeys.HR_MANAGE_REVIEWS -> p.setHrManageReviews(value);
            case PermissionKeys.HR_VIEW_DEPARTMENTS -> p.setHrViewDepartments(value);
            case PermissionKeys.HR_MANAGE_DEPARTMENTS -> p.setHrManageDepartments(value);
            case PermissionKeys.HR_VIEW_POSITIONS -> p.setHrViewPositions(value);
            case PermissionKeys.HR_MANAGE_POSITIONS -> p.setHrManagePositions(value);
            case PermissionKeys.HR_VIEW_DASHBOARD -> p.setHrViewDashboard(value);
            case PermissionKeys.HR_EXPORT -> p.setHrExport(value);
            // Contract
            case PermissionKeys.CONTRACT_VIEW -> p.setContractView(value);
            case PermissionKeys.CONTRACT_CREATE -> p.setContractCreate(value);
            case PermissionKeys.CONTRACT_EDIT -> p.setContractEdit(value);
            case PermissionKeys.CONTRACT_DELETE -> p.setContractDelete(value);
            case PermissionKeys.CONTRACT_RENEW -> p.setContractRenew(value);
            // Salary
            case PermissionKeys.SALARY_VIEW -> p.setSalaryView(value);
            case PermissionKeys.SALARY_CALCULATE -> p.setSalaryCalculate(value);
            case PermissionKeys.SALARY_APPROVE -> p.setSalaryApprove(value);
            case PermissionKeys.SALARY_EXPORT -> p.setSalaryExport(value);
            // Leave
            case PermissionKeys.LEAVE_APPROVE -> p.setLeaveApprove(value);
            case PermissionKeys.LEAVE_VIEW_ALL -> p.setLeaveViewAll(value);
            // Attendance
            case PermissionKeys.ATTENDANCE_VIEW_ALL -> p.setAttendanceViewAll(value);
            case PermissionKeys.ATTENDANCE_EDIT -> p.setAttendanceEdit(value);
            // Review
            case PermissionKeys.REVIEW_VIEW_ALL -> p.setReviewViewAll(value);
            case PermissionKeys.REVIEW_CREATE -> p.setReviewCreate(value);
            case PermissionKeys.REVIEW_APPROVE -> p.setReviewApprove(value);
            // OKR
            case PermissionKeys.OKR_MANAGE -> p.setOkrManage(value);
            // Onboarding
            case PermissionKeys.ONBOARDING_MANAGE -> p.setOnboardingManage(value);
            // Project
            case PermissionKeys.PROJECT_CREATE -> p.setProjectCreate(value);
            case PermissionKeys.PROJECT_MANAGE_ALL -> p.setProjectManageAll(value);
            case PermissionKeys.PROJECT_DELETE -> p.setProjectDelete(value);
            case PermissionKeys.PROJECT_MANAGE_ISSUES -> p.setProjectManageIssues(value);
            case PermissionKeys.PROJECT_MANAGE_SPRINTS -> p.setProjectManageSprints(value);
            case PermissionKeys.PROJECT_VIEW_DASHBOARD -> p.setProjectViewDashboard(value);
            case PermissionKeys.PROJECT_EXPORT -> p.setProjectExport(value);
            case PermissionKeys.PROJECT_MANAGE_PHASES -> p.setProjectManagePhases(value);
            case PermissionKeys.PROJECT_RESOURCE_PLANNING -> p.setProjectResourcePlanning(value);
            // Time Tracking
            case PermissionKeys.TIMETRACKING_LOG -> p.setTimetrackingLog(value);
            case PermissionKeys.TIMETRACKING_VIEW_ALL -> p.setTimetrackingViewAll(value);
            // Analytics
            case PermissionKeys.ANALYTICS_VIEW -> p.setAnalyticsView(value);
            // Calendar
            case PermissionKeys.CALENDAR_VIEW -> p.setCalendarView(value);
            case PermissionKeys.CALENDAR_MANAGE -> p.setCalendarManage(value);
            // Chat
            case PermissionKeys.CHAT_CREATE_GROUP -> p.setChatCreateGroup(value);
            case PermissionKeys.CHAT_SEND_MESSAGE -> p.setChatSendMessage(value);
            case PermissionKeys.CHAT_SHARE_FILE -> p.setChatShareFile(value);
            // Storage
            case PermissionKeys.STORAGE_UPLOAD -> p.setStorageUpload(value);
            case PermissionKeys.STORAGE_DELETE -> p.setStorageDelete(value);
            case PermissionKeys.STORAGE_SHARE -> p.setStorageShare(value);
            case PermissionKeys.STORAGE_MANAGE_FOLDERS -> p.setStorageManageFolders(value);
            // AI
            case PermissionKeys.AI_CHAT -> p.setAiChat(value);
            case PermissionKeys.AI_CREATE_ISSUES -> p.setAiCreateIssues(value);

            default -> throw new BadRequestException("Mã quyền không tồn tại: " + key);
        }
    }

    // [Bật/tắt tất cả quyền của một module cho member]
    // Admin tích "HR" → bật tất cả sub-permissions HR cho member đó
    @Transactional
    public void applyModuleTemplate(Long companyId, Long targetUserId, String module, boolean enabled) {
        accessControlService.checkPermission(companyId, CompanyRole.COMPANY_ADMIN);

        CompanyMember targetMember = findActiveMember(targetUserId, companyId);
        if (targetMember.hasAnyRole(CompanyRole.OWNER)) {
            throw new ForbiddenException("Không thể sửa quyền hạn của Chủ sở hữu");
        }

        UserPermissions perms = targetMember.getPermissions();
        if (perms == null) {
            CompanyRole primaryRole2 = targetMember.getRoles().stream().findFirst().orElse(CompanyRole.EMPLOYEE);
            perms = UserPermissions.defaultFor(primaryRole2);
            targetMember.setPermissions(perms);
        }

        switch (module.toUpperCase()) {
            case "HR" -> perms.applyHrTemplate(enabled);
            case "CONTRACT" -> perms.applyContractTemplate(enabled);
            case "SALARY" -> perms.applySalaryTemplate(enabled);
            case "LEAVE" -> perms.applyLeaveTemplate(enabled);
            case "ATTENDANCE" -> perms.applyAttendanceTemplate(enabled);
            case "REVIEW" -> perms.applyReviewTemplate(enabled);
            case "OKR" -> perms.applyOkrTemplate(enabled);
            case "ONBOARDING" -> perms.applyOnboardingTemplate(enabled);
            case "PROJECT" -> perms.applyProjectTemplate(enabled);
            case "TIMETRACKING" -> perms.applyTimetrackingTemplate(enabled);
            case "ANALYTICS" -> perms.applyAnalyticsTemplate(enabled);
            case "CALENDAR" -> perms.applyCalendarTemplate(enabled);
            case "CHAT" -> perms.applyChatTemplate(enabled);
            case "STORAGE" -> perms.applyStorageTemplate(enabled);
            case "AI" -> perms.applyAiTemplate(enabled);
            default -> throw new BadRequestException("Module không tồn tại: " + module);
        }

        memberRepository.save(targetMember);
        log.info("Đã áp dụng template {} = {} cho user {} trong công ty {}",
                module, enabled, targetUserId, companyId);
    }
}
