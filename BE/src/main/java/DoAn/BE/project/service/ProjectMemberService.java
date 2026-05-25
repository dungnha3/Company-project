package DoAn.BE.project.service;

import DoAn.BE.project.dto.UpdateProjectMemberRequest;
import DoAn.BE.common.exception.*;
import DoAn.BE.project.dto.AddMemberRequest;
import DoAn.BE.project.dto.ProjectMemberDTO;
import DoAn.BE.project.entity.Project;
import DoAn.BE.project.entity.ProjectMember;
import DoAn.BE.project.entity.ProjectMember.ProjectRole;
import DoAn.BE.project.repository.ProjectMemberRepository;
import DoAn.BE.project.repository.ProjectRepository;
import DoAn.BE.timetracking.repository.TimeLogRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.hrm.entity.Employee;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

// Service để quản lý thành viên dự án
// Tách từ ProjectService để giảm God class
// /
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ProjectMemberService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final UserRepository userRepository;
    private final DoAn.BE.project.repository.IssueRepository issueRepository;
    private final TimeLogRepository timeLogRepository;
    private final EmployeeRepository employeeRepository;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;

    // Kiểm tra user có quyền truy cập dự án không
    // /
    public void validateProjectAccess(Long projectId, Long userId) {
        projectMemberRepository.findByProject_ProjectIdAndUser_UserId(projectId, userId)
                .orElseThrow(() -> new ProjectAccessDeniedException("Bạn không có quyền truy cập dự án này"));
    }

    // Kiểm tra user có quyền quản lý dự án không
    // /
    public void validateProjectManagement(Long projectId, Long userId) {
        ProjectMember member = projectMemberRepository.findByProject_ProjectIdAndUser_UserId(projectId, userId)
                .orElseThrow(() -> new ProjectAccessDeniedException("Bạn không có quyền truy cập dự án này"));

        if (!member.canManageProject()) {
            throw new ForbiddenException("Bạn không có quyền quản lý dự án này");
        }
    }

    // Kiểm tra user có phải member của project không
    // /
    public boolean isMember(Long projectId, Long userId) {
        return projectMemberRepository.findByProject_ProjectIdAndUser_UserId(projectId, userId).isPresent();
    }

    // Thêm thành viên vào dự án
    // /
    @Transactional
    public ProjectMemberDTO addMember(Long projectId, AddMemberRequest request, Long userId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dự án"));

        validateProjectManagement(projectId, userId);

        User newMember = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        if (projectMemberRepository.findByProject_ProjectIdAndUser_UserId(projectId, request.getUserId()).isPresent()) {
            throw new DuplicateException("Người dùng đã là thành viên của dự án");
        }

        ProjectMember projectMember = new ProjectMember(project, newMember, request.getRole());
        projectMember = projectMemberRepository.save(projectMember);



        // Publish Event for Member Added
        eventPublisher.publishEvent(new DoAn.BE.project.event.ProjectEvent(this,
                DoAn.BE.project.event.ProjectEvent.Type.MEMBER_ADDED,
                convertToProjectDTO(project),
                userId,
                convertToMemberDTO(projectMember)));

        // Remove old manual notification logic
        // notifyMemberAdded(project, newMember, request.getRole());

        return convertToMemberDTO(projectMember);
    }

    private DoAn.BE.project.dto.ProjectDTO convertToProjectDTO(Project project) {
        DoAn.BE.project.dto.ProjectDTO dto = new DoAn.BE.project.dto.ProjectDTO();
        dto.setProjectId(project.getProjectId());
        dto.setName(project.getName());
        return dto;
    }

    // Xóa thành viên khỏi dự án
    // /
    @Transactional
    public void removeMember(Long projectId, Long memberId, Long userId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dự án"));

        validateProjectManagement(projectId, userId);

        ProjectMember memberToRemove = projectMemberRepository
                .findByProject_ProjectIdAndUser_UserId(projectId, memberId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thành viên trong dự án"));

        if (memberToRemove.isOwner()) {
            throw new ForbiddenException("Không thể xóa chủ dự án");
        }

        projectMemberRepository.delete(memberToRemove);

        // Unassign issues from this member in this project (Ghost Cleanup)
        issueRepository.unassignByProjectMember(projectId, memberId);



        // Publish Event for Member Removed
        eventPublisher.publishEvent(new DoAn.BE.project.event.ProjectEvent(this,
                DoAn.BE.project.event.ProjectEvent.Type.MEMBER_REMOVED,
                convertToProjectDTO(project),
                userId,
                convertToMemberDTO(memberToRemove)));
    }

    // Cập nhật vai trò thành viên
    // /
    @Transactional
    public ProjectMemberDTO updateMemberRole(Long projectId, Long memberId, ProjectRole newRole,
            Long userId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dự án"));

        validateProjectManagement(projectId, userId);

        ProjectMember memberToUpdate = projectMemberRepository
                .findByProject_ProjectIdAndUser_UserId(projectId, memberId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thành viên trong dự án"));

        if (memberToUpdate.isOwner()) {
            throw new ForbiddenException("Không thể thay đổi vai trò của chủ dự án");
        }

        // Don't update if role is the same
        if (memberToUpdate.getRole() == newRole) {
            return convertToMemberDTO(memberToUpdate);
        }

        memberToUpdate.setRole(newRole);
        memberToUpdate = projectMemberRepository.save(memberToUpdate);

        // Sync to Chat (simplified: just remove and add, or specific method if chat
        // service supports)
        // handles role
        // explicitly.
        // Let's assume remove+add or specific update.
        // Checking ProjectChatIntegrationService usage... users are added with role.
        // Safest approach: update role in chat logic if exists, otherwise proceed.
        // Re-using notifyMemberAdded might be confusing.
        // Let's publish event and let listener handle chat update if possible.

        // Publish Event for Role Changed
        eventPublisher.publishEvent(new DoAn.BE.project.event.ProjectEvent(this,
                DoAn.BE.project.event.ProjectEvent.Type.ROLE_CHANGED,
                convertToProjectDTO(project),
                userId,
                convertToMemberDTO(memberToUpdate)));

        return convertToMemberDTO(memberToUpdate);
    }

    // Lấy danh sách thành viên dự án
    @Transactional(readOnly = true)
    public List<ProjectMemberDTO> getProjectMembers(Long projectId, Long userId) {
        validateProjectAccess(projectId, userId);

        List<ProjectMember> members = projectMemberRepository.findByProject_ProjectId(projectId);
        return members.stream()
                .map(m -> convertToMemberDTOWithStats(m, projectId))
                .collect(Collectors.toList());
    }

    // Cập nhật thông tin HR mở rộng của member (position, allocation, billing...)
    @Transactional
    public ProjectMemberDTO updateMemberInfo(Long projectId, Long memberId,
            UpdateProjectMemberRequest req, Long userId) {
        validateProjectManagement(projectId, userId);

        ProjectMember member = projectMemberRepository
                .findByProject_ProjectIdAndUser_UserId(projectId, memberId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thành viên trong dự án"));

        if (req.getPosition() != null)          member.setPosition(req.getPosition());
        if (req.getAllocationRate() != null)     member.setAllocationRate(req.getAllocationRate());
        if (req.getMemberStatus() != null)      member.setMemberStatus(req.getMemberStatus());
        if (req.getJoinDate() != null)          member.setJoinDate(req.getJoinDate());
        if (req.getLeaveDate() != null)         member.setLeaveDate(req.getLeaveDate());
        if (req.getYearsOfExperience() != null) member.setYearsOfExperience(req.getYearsOfExperience());
        if (req.getBillingRate() != null)       member.setBillingRate(req.getBillingRate());
        if (req.getSkillNotes() != null)        member.setSkillNotes(req.getSkillNotes());

        member = projectMemberRepository.save(member);
        log.info("Updated member info for user {} in project {}", memberId, projectId);
        return convertToMemberDTOWithStats(member, projectId);
    }

    // ===== Private helper methods =====



    private ProjectMemberDTO convertToMemberDTO(ProjectMember member) {
        return convertToMemberDTOWithStats(member, member.getProject() != null ? member.getProject().getProjectId() : null);
    }

    private ProjectMemberDTO convertToMemberDTOWithStats(ProjectMember member, Long projectId) {
        ProjectMemberDTO dto = new ProjectMemberDTO();
        dto.setId(member.getId());

        if (member.getUser() != null) {
            dto.setUserId(member.getUser().getUserId());
            dto.setUsername(member.getUser().getUsername());
            dto.setFullName(member.getUser().getFullName());
            dto.setEmail(member.getUser().getEmail());
            dto.setAvatarUrl(member.getUser().getAvatarUrl());
        }

        dto.setRole(member.getRole());
        dto.setJoinedAt(member.getCreatedAt());

        // HR extended fields
        dto.setPosition(member.getPosition());
        dto.setAllocationRate(member.getAllocationRate());
        dto.setMemberStatus(member.getMemberStatus());
        dto.setJoinDate(member.getJoinDate());
        dto.setLeaveDate(member.getLeaveDate());
        dto.setYearsOfExperience(member.getYearsOfExperience());
        dto.setBillingRate(member.getBillingRate());
        dto.setSkillNotes(member.getSkillNotes());

        // Computed stats (only when projectId is available)
        if (projectId != null && member.getUser() != null) {
            Long uid = member.getUser().getUserId();
            dto.setTotalIssues(issueRepository.countByProject_ProjectIdAndAssignee_UserId(projectId, uid));
            dto.setCompletedIssues(issueRepository.countCompletedByProjectAndAssignee(projectId, uid));
            java.math.BigDecimal hours = timeLogRepository.sumHoursByUserAndProject(uid, projectId);
            dto.setTotalLoggedHours(hours != null ? hours.doubleValue() : 0.0);
        }

        return dto;
    }
    // ===== Resource Planning — Module 5 =====

    /**
     * Trả về toàn bộ resource overview: tất cả nhân viên trong công ty
     * + các dự án đang tham gia (nếu có).
     * Tính tổng allocationRate, detect overload (>100%).
     */
    @Transactional(readOnly = true)
    public java.util.List<DoAn.BE.project.dto.ResourceOverviewDTO> getResourceOverview() {
        Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();
        if (companyId == null) return java.util.Collections.emptyList();

        // Lấy tất cả nhân viên active trong công ty (bao gồm cả chưa có project)
        List<Employee> employees = employeeRepository.findByStatusAndCompany_CompanyId(
                Employee.EmployeeStatus.ACTIVE, companyId);

        // Lấy tất cả project members trong công ty
        List<ProjectMember> members = projectMemberRepository.findActiveByCompany(companyId);

        // Group project members by userId
        java.util.Map<Long, List<ProjectMember>> membersByUser = members.stream()
                .collect(Collectors.groupingBy(m -> m.getUser().getUserId()));

        return employees.stream()
                .map(emp -> {
                    DoAn.BE.project.dto.ResourceOverviewDTO dto = new DoAn.BE.project.dto.ResourceOverviewDTO();
                    User user = emp.getUser();
                    dto.setUserId(user.getUserId());
                    dto.setFullName(emp.getFullName());
                    dto.setEmail(user.getEmail());
                    dto.setAvatarUrl(user.getAvatarUrl());

                    // Lấy các project slots cho user này
                    List<ProjectMember> userMembers = membersByUser.getOrDefault(user.getUserId(), java.util.Collections.emptyList());

                    List<DoAn.BE.project.dto.ResourceOverviewDTO.ProjectSlot> slots = userMembers.stream()
                            .map(m -> {
                                DoAn.BE.project.dto.ResourceOverviewDTO.ProjectSlot slot =
                                        new DoAn.BE.project.dto.ResourceOverviewDTO.ProjectSlot();
                                slot.setProjectId(m.getProject().getProjectId());
                                slot.setProjectName(m.getProject().getName());
                                slot.setRole(m.getRole() != null ? m.getRole().name() : null);
                                slot.setPosition(m.getPosition());
                                slot.setAllocationRate(m.getAllocationRate());
                                slot.setMemberStatus(m.getMemberStatus() != null ? m.getMemberStatus().name() : null);
                                // Time logged for this project
                                java.math.BigDecimal hours = timeLogRepository.sumHoursByUserAndProject(
                                        m.getUser().getUserId(), m.getProject().getProjectId());
                                slot.setTotalLoggedHours(hours != null ? hours.doubleValue() : 0.0);
                                return slot;
                            })
                            .collect(java.util.stream.Collectors.toList());

                    dto.setProjects(slots);

                    // Total allocation
                    int total = slots.stream()
                            .mapToInt(s -> s.getAllocationRate() != null ? s.getAllocationRate() : 0)
                            .sum();
                    dto.setTotalAllocation(total);
                    dto.setOverloaded(total > 100);

                    return dto;
                })
                .sorted(java.util.Comparator.comparing(
                        DoAn.BE.project.dto.ResourceOverviewDTO::getTotalAllocation).reversed())
                .collect(java.util.stream.Collectors.toList());
    }
}
