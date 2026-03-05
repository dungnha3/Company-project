package DoAn.BE.project.service;

import DoAn.BE.chat.entity.ChatRoom;
import DoAn.BE.chat.entity.ChatRoomMember;
import DoAn.BE.chat.entity.ChatRoomMemberId;
import DoAn.BE.chat.repository.ChatRoomMemberRepository;
import DoAn.BE.chat.repository.ChatRoomRepository;
import DoAn.BE.common.exception.*;
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
    private final ChatRoomRepository chatRoomRepository;
    private final ChatRoomMemberRepository chatRoomMemberRepository;
    private final StorageProjectIntegrationService storageProjectIntegrationService;
    private final DoAn.BE.project.repository.IssueRepository issueRepository;
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

        // Sync with chat room
        syncMemberToChat(project, newMember, request.getRole());

        // Create project folder
        createProjectFolderForMember(project, newMember);

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

        // Remove from chat
        removeMemberFromChat(project, memberId);

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
    // /
    @Transactional(readOnly = true)
    public List<ProjectMemberDTO> getProjectMembers(Long projectId, Long userId) {
        validateProjectAccess(projectId, userId);

        List<ProjectMember> members = projectMemberRepository.findByProject_ProjectId(projectId);
        return members.stream()
                .map(this::convertToMemberDTO)
                .collect(Collectors.toList());
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
