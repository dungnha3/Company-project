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
import DoAn.BE.project.entity.ProjectMember;
import DoAn.BE.project.entity.ProjectMember.ProjectRole;
import DoAn.BE.project.repository.ProjectMemberRepository;
import DoAn.BE.project.repository.ProjectRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

// [Service quản lý dự án - CRUD, members, phòng ban] (Role: Project Manager/Employee)
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final ChatRoomMemberRepository chatRoomMemberRepository;
    private final ProjectChatIntegrationService projectChatIntegrationService;
    private final DoAn.BE.notification.service.ProjectNotificationService projectNotificationService;
    private final DoAn.BE.notification.service.FCMService fcmService;
    private final DoAn.BE.storage.service.StorageProjectIntegrationService storageProjectIntegrationService;
    private final AccessControlService accessControlService;

    @Transactional
    public ProjectDTO createProject(CreateProjectRequest request, User currentUser) {
        // [Granular Permission] Kiểm tra quyền tạo dự án
        accessControlService.checkProjectCreatePermission();

        log.info("User {} tạo dự án mới: {}", currentUser.getUsername(), request.getName());

        if (projectRepository.findByKeyProject(request.getKeyProject()).isPresent()) {
            throw new DuplicateException("Mã dự án đã tồn tại: " + request.getKeyProject());
        }
        Department department = null;
        if (request.getPhongbanId() != null) {
            department = departmentRepository.findById(request.getPhongbanId())
                    .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy phòng ban"));
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

        return convertToDTO(project);
    }

    @Transactional(readOnly = true)
    public ProjectDTO getProjectById(Long projectId, User currentUser) {
        // Admin và HR/Accounting không có quyền
        if (!accessControlService.canAccessProjects(currentUser)) {
            throw new ForbiddenException("Bạn không có quyền truy cập dự án");
        }

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy dự án"));

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
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy dự án"));

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
                if (request.getStatus() == Project.ProjectStatus.COMPLETED) {
                    projectChatIntegrationService.notifyProjectCompleted(project);

                    // Gửi thông báo đến tất cả thành viên
                    List<ProjectMember> members = projectMemberRepository.findByProject_ProjectId(projectId);
                    for (ProjectMember member : members) {
                        if (member.getUser() != null) {
                            projectNotificationService.createProjectCompletedNotification(
                                    member.getUser().getUserId(),
                                    project.getName(),
                                    project.getProjectId());
                        }
                    }
                } else {
                    projectChatIntegrationService.notifyProjectStatusChanged(
                            project,
                            oldStatus != null ? oldStatus.toString() : "N/A",
                            request.getStatus().toString());

                    // Gửi thông báo đến tất cả thành viên
                    List<ProjectMember> members = projectMemberRepository.findByProject_ProjectId(projectId);
                    for (ProjectMember member : members) {
                        if (member.getUser() != null) {
                            projectNotificationService.createProjectStatusChangedNotification(
                                    member.getUser().getUserId(),
                                    project.getName(),
                                    request.getStatus().toString(),
                                    project.getProjectId());
                        }
                    }
                }
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
                    .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy phòng ban"));
            project.setDepartment(dept);
        }

        // Validate ngày tháng
        if (project.getStartDate() != null && project.getEndDate() != null) {
            if (project.getEndDate().isBefore(project.getStartDate())) {
                throw new BadRequestException("Ngày kết thúc phải sau ngày bắt đầu");
            }
        }

        project = projectRepository.save(project);
        return convertToDTO(project);
    }

    @Transactional
    public void deleteProject(Long projectId, Long userId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy dự án"));

        // Chỉ OWNER mới được xóa dự án
        ProjectMember member = projectMemberRepository.findByProject_ProjectIdAndUser_UserId(projectId, userId)
                .orElseThrow(() -> new ProjectAccessDeniedException("Bạn không có quyền truy cập dự án này"));

        if (!member.isOwner()) {
            throw new ForbiddenException("Chỉ chủ dự án mới có thể xóa dự án");
        }

        // Xóa mềm (Soft delete)
        project.setIsActive(false);
        projectRepository.save(project);

        // Lưu trữ chat dự án - set inactive nhưng giữ lịch sử
        List<ChatRoom> projectChats = chatRoomRepository.findByProject(project);
        if (!projectChats.isEmpty()) {
            ChatRoom projectChatRoom = projectChats.get(0);
            // Gửi tin nhắn hệ thống cuối cùng
            projectChatIntegrationService.postSystemMessage(project,
                    " Dự án đã được đóng. Chat room sẽ chuyển sang chế độ chỉ đọc.");
            log.info("Archived project chat room {} for project {}", projectChatRoom.getRoomId(), projectId);
        }

        // Gửi thông báo đến tất cả thành viên
        List<ProjectMember> members = projectMemberRepository.findByProject_ProjectId(projectId);
        for (ProjectMember projectMember : members) {
            if (projectMember.getUser() != null) {
                projectNotificationService.createProjectArchivedNotification(
                        projectMember.getUser().getUserId(),
                        project.getName());
            }
        }
    }

    @Transactional
    public ProjectMemberDTO addMember(Long projectId, AddMemberRequest request, Long userId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy dự án"));

        // Kiểm tra quyền quản lý dự án
        validateProjectManagement(projectId, userId);

        // Validate thành viên mới tồn tại
        User newMember = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy người dùng"));

        // Kiểm tra xem user đã là thành viên chưa
        if (projectMemberRepository.findByProject_ProjectIdAndUser_UserId(projectId, request.getUserId()).isPresent()) {
            throw new DuplicateException("Người dùng đã là thành viên của dự án");
        }

        // Thêm thành viên
        ProjectMember projectMember = new ProjectMember(project, newMember, request.getRole());
        projectMember = projectMemberRepository.save(projectMember);

        // Đồng bộ với project chat room
        List<ChatRoom> projectChats = chatRoomRepository.findByProject(project);
        if (!projectChats.isEmpty()) {
            ChatRoom projectChatRoom = projectChats.get(0);

            // Kiểm tra nếu chưa trong chat
            boolean alreadyInChat = chatRoomMemberRepository
                    .existsByChatRoom_RoomIdAndUser_UserId(projectChatRoom.getRoomId(), request.getUserId());

            if (!alreadyInChat) {
                ChatRoomMember chatMember = new ChatRoomMember();
                // Tạo composite key trước
                ChatRoomMemberId chatMemberId = new ChatRoomMemberId();
                chatMemberId.setRoomId(projectChatRoom.getRoomId());
                chatMemberId.setUserId(newMember.getUserId());
                chatMember.setId(chatMemberId);
                chatMember.setChatRoom(projectChatRoom);
                chatMember.setUser(newMember);
                // OWNER/MANAGER = ADMIN, khác = MEMBER
                chatMember.setRole(request.getRole() == ProjectRole.OWNER || request.getRole() == ProjectRole.MANAGER
                        ? ChatRoomMember.MemberRole.ADMIN
                        : ChatRoomMember.MemberRole.MEMBER);
                chatMember.setJoinedAt(LocalDateTime.now());
                chatRoomMemberRepository.save(chatMember);

                log.info("Đã thêm user {} vào project chat room {}", request.getUserId(), projectChatRoom.getRoomId());
            }
        }

        // Tạo thư mục dự án cho thành viên mới
        try {
            storageProjectIntegrationService.getOrCreateProjectFolder(project, newMember);
            log.info("Created project folder for new member {} in project {}", newMember.getUserId(), projectId);
        } catch (Exception e) {
            log.error("Failed to create project folder for member {}: {}", newMember.getUserId(), e.getMessage());
            // Không fail toàn bộ operation nếu tạo folder thất bại
        }

        // Gửi tin nhắn hệ thống
        projectChatIntegrationService.notifyMemberAdded(project, newMember.getUsername(), request.getRole().toString());

        // Gửi thông báo đến thành viên mới
        projectNotificationService.createProjectMemberAddedNotification(
                newMember.getUserId(),
                project.getName(),
                project.getProjectId());

        // 📱 Push FCM notification đến thành viên mới
        try {
            if (newMember.getFcmToken() != null) {
                Map<String, String> data = new HashMap<>();
                data.put("type", "PROJECT_MEMBER_ADDED");
                data.put("projectId", project.getProjectId().toString());
                data.put("link", "/projects/" + project.getProjectId());
                fcmService.sendToDevice(
                        newMember.getFcmToken(),
                        "📁 Được thêm vào dự án",
                        "Bạn đã được thêm vào dự án \"" + project.getName() + "\"",
                        data);
            }
        } catch (Exception e) {
            log.warn("Không thể gửi FCM notification: {}", e.getMessage());
        }

        return convertToMemberDTO(projectMember);
    }

    @Transactional
    public void removeMember(Long projectId, Long memberId, Long userId) {
        // Kiểm tra dự án tồn tại
        projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy dự án"));

        // Kiểm tra quyền quản lý dự án
        validateProjectManagement(projectId, userId);

        ProjectMember memberToRemove = projectMemberRepository
                .findByProject_ProjectIdAndUser_UserId(projectId, memberId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy thành viên trong dự án"));

        // Không thể xóa OWNER
        if (memberToRemove.isOwner()) {
            throw new ForbiddenException("Không thể xóa chủ dự án");
        }

        projectMemberRepository.delete(memberToRemove);

        // Đồng bộ với project chat room
        Project project = projectRepository.findById(projectId).orElse(null);
        if (project != null) {
            List<ChatRoom> projectChats = chatRoomRepository.findByProject(project);
            if (!projectChats.isEmpty()) {
                ChatRoom projectChatRoom = projectChats.get(0);

                java.util.Optional<ChatRoomMember> chatMemberOpt = chatRoomMemberRepository
                        .findByChatRoom_RoomIdAndUser_UserId(projectChatRoom.getRoomId(), memberId);

                if (chatMemberOpt.isPresent()) {
                    chatRoomMemberRepository.delete(chatMemberOpt.get());
                    log.info("Đã xóa user {} khỏi project chat room {}", memberId, projectChatRoom.getRoomId());
                }
            }

            // Gửi tin nhắn hệ thống
            projectChatIntegrationService.notifyMemberRemoved(project, memberToRemove.getUser().getUsername());

            // Gửi thông báo đến thành viên bị xóa
            if (memberToRemove.getUser() != null) {
                projectNotificationService.createProjectMemberRemovedNotification(
                        memberToRemove.getUser().getUserId(),
                        project.getName());

                // 📱 Push FCM notification đến thành viên bị xóa
                try {
                    if (memberToRemove.getUser().getFcmToken() != null) {
                        Map<String, String> data = new HashMap<>();
                        data.put("type", "PROJECT_MEMBER_REMOVED");
                        data.put("link", "/projects");
                        fcmService.sendToDevice(
                                memberToRemove.getUser().getFcmToken(),
                                "📁 Đã bị xóa khỏi dự án",
                                "Bạn đã bị xóa khỏi dự án \"" + project.getName() + "\"",
                                data);
                    }
                } catch (Exception e) {
                    log.warn("Không thể gửi FCM notification: {}", e.getMessage());
                }
            }
        }
    }

    @Transactional(readOnly = true)
    public List<ProjectMemberDTO> getProjectMembers(Long projectId, Long userId) {
        // Kiểm tra quyền truy cập
        validateProjectAccess(projectId, userId);

        List<ProjectMember> members = projectMemberRepository.findByProject_ProjectId(projectId);
        return members.stream()
                .map(this::convertToMemberDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public ProjectMemberDTO updateMemberRole(Long projectId, Long memberId, ProjectRole newRole, Long userId) {
        // Kiểm tra quyền quản lý dự án
        validateProjectManagement(projectId, userId);

        ProjectMember member = projectMemberRepository.findByProject_ProjectIdAndUser_UserId(projectId, memberId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy thành viên trong dự án"));

        // Không thể thay đổi role của OWNER
        if (member.isOwner()) {
            throw new ForbiddenException("Không thể thay đổi vai trò của chủ dự án");
        }

        member.setRole(newRole);
        member = projectMemberRepository.save(member);

        // Gửi thông báo đến thành viên
        if (member.getUser() != null && member.getProject() != null) {
            projectNotificationService.createProjectRoleChangedNotification(
                    member.getUser().getUserId(),
                    member.getProject().getName(),
                    newRole.toString(),
                    member.getProject().getProjectId());
        }

        return convertToMemberDTO(member);
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

    private ProjectMemberDTO convertToMemberDTO(ProjectMember member) {
        ProjectMemberDTO dto = new ProjectMemberDTO();
        dto.setId(member.getId());

        if (member.getUser() != null) {
            dto.setUserId(member.getUser().getUserId());
            dto.setUsername(member.getUser().getUsername());
            dto.setEmail(member.getUser().getEmail());
            dto.setAvatarUrl(member.getUser().getAvatarUrl());
        }

        dto.setRole(member.getRole());
        dto.setJoinedAt(member.getCreatedAt());
        return dto;
    }
}
