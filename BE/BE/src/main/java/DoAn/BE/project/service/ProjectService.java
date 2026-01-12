package DoAn.BE.project.service;

import DoAn.BE.common.exception.*;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.hrm.entity.Department;
import DoAn.BE.hrm.repository.DepartmentRepository;
import DoAn.BE.chat.entity.ChatRoom;
import DoAn.BE.chat.entity.ChatRoomMember;
import DoAn.BE.chat.entity.ChatRoomMemberId;
import DoAn.BE.chat.repository.ChatRoomRepository;
import DoAn.BE.chat.repository.ChatRoomMemberRepository;
import lombok.extern.slf4j.Slf4j;
import DoAn.BE.project.dto.*;
import DoAn.BE.project.entity.Project;
import DoAn.BE.project.entity.Project.ProjectStatus;
import DoAn.BE.project.entity.ProjectMember;
import DoAn.BE.project.entity.ProjectMember.ProjectRole;
import DoAn.BE.project.repository.IssueRepository;
import DoAn.BE.project.repository.IssueStatusRepository;
import DoAn.BE.project.repository.ProjectMemberRepository;
import DoAn.BE.project.repository.ProjectRepository;
import DoAn.BE.project.repository.SprintRepository;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.stream.Collectors;

// [Service quản lý dự án - CRUD, phân quyền] (Role: Project Manager/Employee)
// Member operations delegated to ProjectMemberService
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final DepartmentRepository departmentRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final ChatRoomMemberRepository chatRoomMemberRepository;
    private final ProjectChatIntegrationService projectChatIntegrationService;
    private final DoAn.BE.storage.service.StorageProjectIntegrationService storageProjectIntegrationService;
    private final AccessControlService accessControlService;
    private final DoAn.BE.company.service.SubscriptionService subscriptionService;
    private final SprintRepository sprintRepository;
    private final IssueRepository issueRepository;
    private final IssueStatusRepository issueStatusRepository;
    private final ApplicationEventPublisher eventPublisher;

    // [REFACTOR] Delegate member operations to specialized service
    private final ProjectMemberService projectMemberService;

    @Transactional
    public ProjectDTO createProject(CreateProjectRequest request, User currentUser) {
        // [Granular Permission] Kiểm tra quyền tạo dự án
        accessControlService.checkProjectCreatePermission();

        // [SAAS] Kiểm tra giới hạn gói cước
        subscriptionService.checkProjectLimit(DoAn.BE.common.context.TenantContext.getCompanyId());

        log.info("User {} tạo dự án mới: {}", currentUser.getUsername(), request.getName());

        if (projectRepository.findByKeyProject(request.getKeyProject()).isPresent()) {
            throw new DuplicateException("Mã dự án đã tồn tại: " + request.getKeyProject());
        }
        Department department = null;
        if (request.getPhongbanId() != null) {
            department = departmentRepository.findById(request.getPhongbanId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng ban"));
        }

        // Validate dates
        if (request.getStartDate() != null && request.getEndDate() != null) {
            if (request.getEndDate().isBefore(request.getStartDate())) {
                throw new BadRequestException("Ngày kết thúc phải sau ngày bắt đầu");
            }
        }
        Project project = new Project();
        project.setName(request.getName());
        project.setKeyProject(request.getKeyProject());
        project.setDescription(request.getDescription());
        project.setStartDate(request.getStartDate());
        project.setEndDate(request.getEndDate());
        project.setCreatedBy(currentUser);
        project.setDepartment(department);
        project.setStatus(Project.ProjectStatus.ACTIVE);
        project.setIsActive(true);

        project = projectRepository.save(project);

        // Add creator as OWNER
        ProjectMember ownerMember = new ProjectMember(project, currentUser, ProjectRole.OWNER);
        projectMemberRepository.save(ownerMember);

        // Auto-create project chat room
        ChatRoom projectChatRoom = new ChatRoom();
        projectChatRoom.setName("💼 " + project.getName());
        projectChatRoom.setType(ChatRoom.RoomType.PROJECT);
        projectChatRoom.setProject(project);
        projectChatRoom.setCreatedBy(currentUser);
        projectChatRoom.setCreatedAt(LocalDateTime.now());
        projectChatRoom = chatRoomRepository.save(projectChatRoom);

        // Add creator to chat room as ADMIN
        ChatRoomMember chatMember = new ChatRoomMember();
        // Create composite key first
        ChatRoomMemberId chatMemberId = new ChatRoomMemberId();
        chatMemberId.setRoomId(projectChatRoom.getRoomId());
        chatMemberId.setUserId(currentUser.getUserId());
        chatMember.setId(chatMemberId);
        chatMember.setChatRoom(projectChatRoom);
        chatMember.setUser(currentUser);
        chatMember.setRole(ChatRoomMember.MemberRole.ADMIN);
        chatMember.setJoinedAt(LocalDateTime.now());
        chatRoomMemberRepository.save(chatMember);

        log.info("Đã tạo project chat room {} cho project {}", projectChatRoom.getRoomId(), project.getProjectId());

        // Auto-create project storage folder
        storageProjectIntegrationService.getOrCreateProjectFolder(project, currentUser);
        log.info("Đã tạo project storage folder cho project {}", project.getProjectId());

        ProjectDTO projectDTO = convertToDTO(project);

        // Publish Event
        eventPublisher.publishEvent(new DoAn.BE.project.event.ProjectEvent(this,
                DoAn.BE.project.event.ProjectEvent.Type.CREATED, projectDTO, currentUser.getUserId()));

        return projectDTO;
    }

    @Transactional(readOnly = true)
    public ProjectDTO getProjectById(Long projectId, User currentUser) {
        // Admin và HR/Accounting không có quyền
        if (!accessControlService.canAccessProjects(currentUser)) {
            throw new ForbiddenException("Bạn không có quyền truy cập dự án");
        }

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dự án"));

        // Kiểm tra xem user có quyền truy cập dự án này không
        validateProjectAccess(projectId, currentUser.getUserId());

        return convertToDTO(project);
    }

    @Transactional(readOnly = true)
    public List<ProjectDTO> getAllProjects(User currentUser) {
        // Kiểm tra quyền truy cập dự án
        if (!accessControlService.canAccessProjects(currentUser)) {
            throw new ForbiddenException("Bạn không có quyền truy cập dự án");
        }

        // Tất cả user đều xem dự án mình tham gia
        return getMyProjects(currentUser.getUserId());
    }

    @Transactional(readOnly = true)
    public Page<ProjectDTO> getAllProjectsPaged(User currentUser, Pageable pageable) {
        // Kiểm tra quyền truy cập dự án
        if (!accessControlService.canAccessProjects(currentUser)) {
            throw new ForbiddenException("Bạn không có quyền truy cập dự án");
        }

        // Tất cả user đều xem dự án mình tham gia
        return getMyProjectsPaged(currentUser.getUserId(), pageable);
    }

    @Transactional(readOnly = true)
    public List<ProjectDTO> getMyProjects(Long userId) {
        List<ProjectMember> memberships = projectMemberRepository.findByUser_UserId(userId);
        return memberships.stream()
                .map(member -> convertToDTO(member.getProject()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<ProjectDTO> getMyProjectsPaged(Long userId, Pageable pageable) {
        Page<ProjectMember> memberships = projectMemberRepository.findByUser_UserId(userId, pageable);
        return memberships.map(member -> convertToDTO(member.getProject()));
    }

    @Transactional(readOnly = true)
    public List<ProjectDTO> getMyProjects(User currentUser) {
        // Admin và HR/Accounting không có quyền
        if (!accessControlService.canAccessProjects(currentUser)) {
            throw new ForbiddenException("Bạn không có quyền truy cập dự án");
        }

        return getMyProjects(currentUser.getUserId());
    }

    @Transactional(readOnly = true)
    public Page<ProjectDTO> getMyProjectsPaged(User currentUser, Pageable pageable) {
        // Admin và HR/Accounting không có quyền
        if (!accessControlService.canAccessProjects(currentUser)) {
            throw new ForbiddenException("Bạn không có quyền truy cập dự án");
        }

        return getMyProjectsPaged(currentUser.getUserId(), pageable);
    }

    @Transactional
    public ProjectDTO updateProject(Long projectId, UpdateProjectRequest request, Long userId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dự án"));

        // Kiểm tra quyền quản lý dự án
        validateProjectManagement(projectId, userId);

        // Cập nhật các trường thông tin
        if (request.getName() != null) {
            project.setName(request.getName());
        }
        if (request.getDescription() != null) {
            project.setDescription(request.getDescription());
        }
        if (request.getStatus() != null) {
            Project.ProjectStatus oldStatus = project.getStatus();
            project.setStatus(request.getStatus());

            // Gửi tin nhắn hệ thống nếu trạng thái thay đổi
            if (oldStatus != request.getStatus()) {
                projectChatIntegrationService.notifyProjectStatusChanged(
                        project,
                        oldStatus != null ? oldStatus.toString() : "N/A",
                        request.getStatus().toString());

                // Publish Event for Status Changed or Completed
                DoAn.BE.project.event.ProjectEvent.Type eventType = request
                        .getStatus() == Project.ProjectStatus.COMPLETED
                                ? DoAn.BE.project.event.ProjectEvent.Type.COMPLETED
                                : DoAn.BE.project.event.ProjectEvent.Type.STATUS_CHANGED;

                eventPublisher.publishEvent(new DoAn.BE.project.event.ProjectEvent(this,
                        eventType,
                        convertToDTO(project),
                        userId));
            }
        }
        if (request.getStartDate() != null) {
            project.setStartDate(request.getStartDate());
        }
        if (request.getEndDate() != null) {
            project.setEndDate(request.getEndDate());
        }
        if (request.getPhongbanId() != null) {
            Department dept = departmentRepository.findById(request.getPhongbanId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng ban"));
            project.setDepartment(dept);
        }

        // Validate ngày tháng
        if (project.getStartDate() != null && project.getEndDate() != null) {
            if (project.getEndDate().isBefore(project.getStartDate())) {
                throw new BadRequestException("Ngày kết thúc phải sau ngày bắt đầu");
            }
        }

        project = projectRepository.save(project);
        ProjectDTO projectDTO = convertToDTO(project);

        // Publish Event
        eventPublisher.publishEvent(new DoAn.BE.project.event.ProjectEvent(this,
                DoAn.BE.project.event.ProjectEvent.Type.UPDATED, projectDTO, userId));

        return projectDTO;
    }

    @Transactional
    public void deleteProject(Long projectId, Long userId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dự án"));

        // Chỉ OWNER mới được xóa dự án
        ProjectMember member = projectMemberRepository.findByProject_ProjectIdAndUser_UserId(projectId, userId)
                .orElseThrow(() -> new ProjectAccessDeniedException("Bạn không có quyền truy cập dự án này"));

        if (!member.isOwner()) {
            throw new ForbiddenException("Chỉ chủ dự án mới có thể xóa dự án");
        }

        // Xóa mềm (Soft delete)
        project.setIsActive(false);
        project.setStatus(ProjectStatus.CANCELLED); // Set status to CANCELLED as well
        projectRepository.save(project);

        // Lưu trữ chat dự án - set inactive nhưng giữ lịch sử
        List<ChatRoom> projectChats = chatRoomRepository.findByProject(project);
        if (!projectChats.isEmpty()) {
            ChatRoom projectChatRoom = projectChats.get(0);
            // Gửi tin nhắn hệ thống cuối cùng
            projectChatIntegrationService.postSystemMessage(project,
                    " Dự án đã được hủy. Chat room sẽ chuyển sang chế độ chỉ đọc.");
            log.info("Archived project chat room {} for project {}", projectChatRoom.getRoomId(), projectId);
        }

        // --- CASCADE SOFT DELETE LOGIC ---
        // 1. Cancel active Sprints
        sprintRepository.updateStatusByProjectId(projectId, DoAn.BE.project.entity.Sprint.SprintStatus.CANCELLED);

        // 2. Mark Issues as "Cancelled" (or Done if Cancelled doesn't exist)
        DoAn.BE.project.entity.IssueStatus cancelledStatus = issueStatusRepository.findByName("Cancelled")
                .orElseGet(() -> {
                    // Create if not exists
                    DoAn.BE.project.entity.IssueStatus newStatus = new DoAn.BE.project.entity.IssueStatus();
                    newStatus.setName("Cancelled");
                    newStatus.setColor("#808080"); // Grey
                    newStatus.setOrderIndex(99);
                    return issueStatusRepository.save(newStatus);
                });
        issueRepository.updateStatusByProjectId(projectId, cancelledStatus);

        // Publish Event
        eventPublisher.publishEvent(new DoAn.BE.project.event.ProjectEvent(this,
                DoAn.BE.project.event.ProjectEvent.Type.DELETED, convertToDTO(project), userId));
    }

    /**
     * @deprecated Use ProjectMemberService.addMember() directly
     */
    @Transactional
    public ProjectMemberDTO addMember(Long projectId, AddMemberRequest request, Long userId) {
        return projectMemberService.addMember(projectId, request, userId);
    }

    /**
     * @deprecated Use ProjectMemberService.removeMember() directly
     */
    @Transactional
    public void removeMember(Long projectId, Long memberId, Long userId) {
        projectMemberService.removeMember(projectId, memberId, userId);
    }

    /**
     * @deprecated Use ProjectMemberService.getProjectMembers() directly
     */
    @Transactional(readOnly = true)
    public List<ProjectMemberDTO> getProjectMembers(Long projectId, Long userId) {
        return projectMemberService.getProjectMembers(projectId, userId);
    }

    /**
     * @deprecated Use ProjectMemberService.updateMemberRole() directly
     */
    @Transactional
    public ProjectMemberDTO updateMemberRole(Long projectId, Long memberId, ProjectRole newRole, Long userId) {
        return projectMemberService.updateMemberRole(projectId, memberId, newRole, userId);
    }

    // Helper methods
    private void validateProjectAccess(Long projectId, Long userId) {
        projectMemberRepository.findByProject_ProjectIdAndUser_UserId(projectId, userId)
                .orElseThrow(() -> new ProjectAccessDeniedException("Bạn không có quyền truy cập dự án này"));
    }

    private void validateProjectManagement(Long projectId, Long userId) {
        ProjectMember member = projectMemberRepository.findByProject_ProjectIdAndUser_UserId(projectId, userId)
                .orElseThrow(() -> new ProjectAccessDeniedException("Bạn không có quyền truy cập dự án này"));

        if (!member.canManageProject()) {
            throw new ForbiddenException("Bạn không có quyền quản lý dự án này");
        }
    }

    private ProjectDTO convertToDTO(Project project) {
        ProjectDTO dto = new ProjectDTO();
        dto.setProjectId(project.getProjectId());
        dto.setName(project.getName());
        dto.setKeyProject(project.getKeyProject());
        dto.setDescription(project.getDescription());
        dto.setStatus(project.getStatus());
        dto.setStartDate(project.getStartDate());
        dto.setEndDate(project.getEndDate());

        if (project.getCreatedBy() != null) {
            dto.setCreatedBy(project.getCreatedBy().getUserId());
            dto.setCreatedByName(project.getCreatedBy().getUsername());
        }

        if (project.getDepartment() != null) {
            dto.setPhongbanId(project.getDepartment().getDepartmentId());
            dto.setPhongbanName(project.getDepartment().getName());
        }

        return dto;
    }
}
