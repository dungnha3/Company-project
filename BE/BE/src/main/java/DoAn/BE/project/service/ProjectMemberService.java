package DoAn.BE.project.service;

import DoAn.BE.chat.entity.ChatRoom;
import DoAn.BE.chat.entity.ChatRoomMember;
import DoAn.BE.chat.entity.ChatRoomMemberId;
import DoAn.BE.chat.repository.ChatRoomMemberRepository;
import DoAn.BE.chat.repository.ChatRoomRepository;
import DoAn.BE.common.exception.*;
import DoAn.BE.notification.service.FCMService;
import DoAn.BE.notification.service.ProjectNotificationService;
import DoAn.BE.project.dto.AddMemberRequest;
import DoAn.BE.project.dto.ProjectMemberDTO;
import DoAn.BE.project.entity.Project;
import DoAn.BE.project.entity.ProjectMember;
import DoAn.BE.project.entity.ProjectMember.ProjectRole;
import DoAn.BE.project.repository.ProjectMemberRepository;
import DoAn.BE.project.repository.ProjectRepository;
import DoAn.BE.storage.service.StorageProjectIntegrationService;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service để quản lý thành viên dự án
 * Tách từ ProjectService để giảm God class
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ProjectMemberService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final UserRepository userRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final ChatRoomMemberRepository chatRoomMemberRepository;
    private final ProjectChatIntegrationService projectChatIntegrationService;
    private final ProjectNotificationService projectNotificationService;
    private final FCMService fcmService;
    private final StorageProjectIntegrationService storageProjectIntegrationService;

    /**
     * Kiểm tra user có quyền truy cập dự án không
     */
    public void validateProjectAccess(Long projectId, Long userId) {
        projectMemberRepository.findByProject_ProjectIdAndUser_UserId(projectId, userId)
                .orElseThrow(() -> new ProjectAccessDeniedException("Bạn không có quyền truy cập dự án này"));
    }

    /**
     * Kiểm tra user có quyền quản lý dự án không
     */
    public void validateProjectManagement(Long projectId, Long userId) {
        ProjectMember member = projectMemberRepository.findByProject_ProjectIdAndUser_UserId(projectId, userId)
                .orElseThrow(() -> new ProjectAccessDeniedException("Bạn không có quyền truy cập dự án này"));

        if (!member.canManageProject()) {
            throw new ForbiddenException("Bạn không có quyền quản lý dự án này");
        }
    }

    /**
     * Kiểm tra user có phải member của project không
     */
    public boolean isMember(Long projectId, Long userId) {
        return projectMemberRepository.findByProject_ProjectIdAndUser_UserId(projectId, userId).isPresent();
    }

    /**
     * Thêm thành viên vào dự án
     */
    @Transactional
    public ProjectMemberDTO addMember(Long projectId, AddMemberRequest request, Long userId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy dự án"));

        validateProjectManagement(projectId, userId);

        User newMember = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy người dùng"));

        if (projectMemberRepository.findByProject_ProjectIdAndUser_UserId(projectId, request.getUserId()).isPresent()) {
            throw new DuplicateException("Người dùng đã là thành viên của dự án");
        }

        ProjectMember projectMember = new ProjectMember(project, newMember, request.getRole());
        projectMember = projectMemberRepository.save(projectMember);

        // Sync with chat room
        syncMemberToChat(project, newMember, request.getRole());

        // Create project folder
        createProjectFolderForMember(project, newMember);

        // Send notifications
        notifyMemberAdded(project, newMember, request.getRole());

        return convertToMemberDTO(projectMember);
    }

    /**
     * Xóa thành viên khỏi dự án
     */
    @Transactional
    public void removeMember(Long projectId, Long memberId, Long userId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy dự án"));

        validateProjectManagement(projectId, userId);

        ProjectMember memberToRemove = projectMemberRepository
                .findByProject_ProjectIdAndUser_UserId(projectId, memberId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy thành viên trong dự án"));

        if (memberToRemove.isOwner()) {
            throw new ForbiddenException("Không thể xóa chủ dự án");
        }

        projectMemberRepository.delete(memberToRemove);

        // Remove from chat
        removeMemberFromChat(project, memberId);

        // Notify
        notifyMemberRemoved(project, memberToRemove);
    }

    /**
     * Lấy danh sách thành viên dự án
     */
    @Transactional(readOnly = true)
    public List<ProjectMemberDTO> getProjectMembers(Long projectId, Long userId) {
        validateProjectAccess(projectId, userId);

        List<ProjectMember> members = projectMemberRepository.findByProject_ProjectId(projectId);
        return members.stream()
                .map(this::convertToMemberDTO)
                .collect(Collectors.toList());
    }

    /**
     * Cập nhật vai trò thành viên
     */
    @Transactional
    public ProjectMemberDTO updateMemberRole(Long projectId, Long memberId, ProjectRole newRole, Long userId) {
        validateProjectManagement(projectId, userId);

        ProjectMember member = projectMemberRepository.findByProject_ProjectIdAndUser_UserId(projectId, memberId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy thành viên"));

        if (member.isOwner() && newRole != ProjectRole.OWNER) {
            throw new ForbiddenException("Không thể thay đổi vai trò chủ dự án");
        }

        member.setRole(newRole);
        member = projectMemberRepository.save(member);

        return convertToMemberDTO(member);
    }

    // ===== Private helper methods =====

    private void syncMemberToChat(Project project, User newMember, ProjectRole role) {
        List<ChatRoom> projectChats = chatRoomRepository.findByProject(project);
        if (!projectChats.isEmpty()) {
            ChatRoom chatRoom = projectChats.get(0);

            boolean alreadyInChat = chatRoomMemberRepository
                    .existsByChatRoom_RoomIdAndUser_UserId(chatRoom.getRoomId(), newMember.getUserId());

            if (!alreadyInChat) {
                ChatRoomMember chatMember = new ChatRoomMember();
                ChatRoomMemberId chatMemberId = new ChatRoomMemberId();
                chatMemberId.setRoomId(chatRoom.getRoomId());
                chatMemberId.setUserId(newMember.getUserId());
                chatMember.setId(chatMemberId);
                chatMember.setChatRoom(chatRoom);
                chatMember.setUser(newMember);
                chatMember.setRole(role == ProjectRole.OWNER || role == ProjectRole.MANAGER
                        ? ChatRoomMember.MemberRole.ADMIN
                        : ChatRoomMember.MemberRole.MEMBER);
                chatMember.setJoinedAt(LocalDateTime.now());
                chatRoomMemberRepository.save(chatMember);

                log.info("Added user {} to project chat room {}", newMember.getUserId(), chatRoom.getRoomId());
            }
        }
    }

    private void removeMemberFromChat(Project project, Long memberId) {
        List<ChatRoom> projectChats = chatRoomRepository.findByProject(project);
        if (!projectChats.isEmpty()) {
            ChatRoom chatRoom = projectChats.get(0);
            chatRoomMemberRepository.findByChatRoom_RoomIdAndUser_UserId(chatRoom.getRoomId(), memberId)
                    .ifPresent(chatMember -> {
                        chatRoomMemberRepository.delete(chatMember);
                        log.info("Removed user {} from project chat room {}", memberId, chatRoom.getRoomId());
                    });
        }
    }

    private void createProjectFolderForMember(Project project, User member) {
        try {
            storageProjectIntegrationService.getOrCreateProjectFolder(project, member);
            log.info("Created project folder for member {} in project {}", member.getUserId(), project.getProjectId());
        } catch (Exception e) {
            log.error("Failed to create project folder: {}", e.getMessage());
        }
    }

    private void notifyMemberAdded(Project project, User newMember, ProjectRole role) {
        projectChatIntegrationService.notifyMemberAdded(project, newMember.getUsername(), role.toString());

        projectNotificationService.createProjectMemberAddedNotification(
                newMember.getUserId(),
                project.getName(),
                project.getProjectId());

        sendFcmNotification(newMember, "📁 Được thêm vào dự án",
                "Bạn đã được thêm vào dự án \"" + project.getName() + "\"",
                "PROJECT_MEMBER_ADDED", "/projects/" + project.getProjectId());
    }

    private void notifyMemberRemoved(Project project, ProjectMember member) {
        projectChatIntegrationService.notifyMemberRemoved(project, member.getUser().getUsername());

        if (member.getUser() != null) {
            projectNotificationService.createProjectMemberRemovedNotification(
                    member.getUser().getUserId(),
                    project.getName());

            sendFcmNotification(member.getUser(), "📁 Đã bị xóa khỏi dự án",
                    "Bạn đã bị xóa khỏi dự án \"" + project.getName() + "\"",
                    "PROJECT_MEMBER_REMOVED", "/projects");
        }
    }

    private void sendFcmNotification(User user, String title, String body, String type, String link) {
        try {
            if (user.getFcmToken() != null) {
                Map<String, String> data = new HashMap<>();
                data.put("type", type);
                data.put("link", link);
                fcmService.sendToDevice(user.getFcmToken(), title, body, data);
            }
        } catch (Exception e) {
            log.warn("Failed to send FCM notification: {}", e.getMessage());
        }
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
