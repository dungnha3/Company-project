package DoAn.BE.chat.service;

import DoAn.BE.chat.dto.ChatRoomDTO;
import DoAn.BE.chat.dto.CreateChatRoomRequest;
import DoAn.BE.chat.entity.ChatRoom;
import DoAn.BE.chat.entity.ChatRoomMember;
import DoAn.BE.chat.entity.ChatRoomMemberId;
import DoAn.BE.chat.entity.Message;
import DoAn.BE.chat.repository.ChatRoomMemberRepository;
import DoAn.BE.chat.repository.ChatRoomRepository;
import DoAn.BE.chat.repository.MessageRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import DoAn.BE.project.entity.Project;
import DoAn.BE.project.repository.ProjectRepository;
import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.chat.websocket.service.WebSocketNotificationService;
import DoAn.BE.notification.service.ChatNotificationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DataAccessException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
@Slf4j
public class ChatRoomService {

    private final ChatRoomRepository chatRoomRepository;
    private final ChatRoomMemberRepository chatRoomMemberRepository;
    private final UserRepository userRepository;
    private final WebSocketNotificationService webSocketNotificationService;
    private final ChatNotificationService chatNotificationService;
    private final ProjectRepository projectRepository;
    private final MessageRepository messageRepository;
    private final AccessControlService accessControlService;
    private final jakarta.persistence.EntityManager entityManager;

    public ChatRoomService(ChatRoomRepository chatRoomRepository,
            ChatRoomMemberRepository chatRoomMemberRepository,
            UserRepository userRepository,
            WebSocketNotificationService webSocketNotificationService,
            ChatNotificationService chatNotificationService,
            ProjectRepository projectRepository,
            MessageRepository messageRepository,
            AccessControlService accessControlService,
            jakarta.persistence.EntityManager entityManager) {
        this.chatRoomRepository = chatRoomRepository;
        this.chatRoomMemberRepository = chatRoomMemberRepository;
        this.userRepository = userRepository;
        this.webSocketNotificationService = webSocketNotificationService;
        this.chatNotificationService = chatNotificationService;
        this.projectRepository = projectRepository;
        this.messageRepository = messageRepository;
        this.accessControlService = accessControlService;
        this.entityManager = entityManager;
    }

    private void validateUserInCompany(Long userId) {
        Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();
        if (companyId != null) {
            Long count = entityManager.createQuery(
                    "SELECT COUNT(cm) FROM CompanyMember cm WHERE cm.company.companyId = :companyId AND cm.user.userId = :userId",
                    Long.class)
                    .setParameter("companyId", companyId)
                    .setParameter("userId", userId)
                    .getSingleResult();
            if (count == 0) {
                throw new ForbiddenException("User does not belong to the current workspace");
            }
        }
    }

    public ChatRoomDTO createChatRoom(CreateChatRoomRequest request, User currentUser) {
        try {
            // [Granular Permission] Kiểm tra quyền tạo nhóm chat
            accessControlService.checkChatCreateGroupPermission();

            if (request.getName() == null || request.getName().trim().isEmpty()) {
                throw new BadRequestException("Tên phòng chat không được để trống");
            }

            log.info("User {} tạo phòng chat: {}", currentUser.getUsername(), request.getName());

            ChatRoom chatRoom = new ChatRoom();
            chatRoom.setName(request.getName().trim());
            chatRoom.setType(request.getRoomType());
            chatRoom.setAvatarUrl(request.getAvatarUrl());
            chatRoom.setCreatedBy(currentUser);
            chatRoom.setCreatedAt(LocalDateTime.now());

            // Handle project chat creation
            if (request.getProjectId() != null) {
                Project project = projectRepository.findById(request.getProjectId())
                        .orElseThrow(() -> new ResourceNotFoundException("Project không tồn tại"));
                chatRoom.setProject(project);
                chatRoom.setType(ChatRoom.RoomType.PROJECT);
                log.info("Tạo project chat room cho project {}", project.getName());
            }

            chatRoom = chatRoomRepository.save(chatRoom);

            // Thêm người tạo làm ADMIN
            ChatRoomMember creatorMember = new ChatRoomMember();
            creatorMember.setId(new ChatRoomMemberId(chatRoom.getRoomId(), currentUser.getUserId()));
            creatorMember.setChatRoom(chatRoom);
            creatorMember.setUser(currentUser);
            creatorMember.setRole(ChatRoomMember.MemberRole.ADMIN);
            creatorMember.setJoinedAt(LocalDateTime.now());
            chatRoomMemberRepository.save(creatorMember);

            // Thêm các thành viên khác từ memberIds
            if (request.getMemberIds() != null && !request.getMemberIds().isEmpty()) {
                Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();
                for (Long memberId : request.getMemberIds()) {
                    // Bỏ qua người tạo (đã thêm ở trên)
                    if (memberId.equals(currentUser.getUserId())) {
                        continue;
                    }

                    User memberUser = userRepository.findById(memberId).orElse(null);
                    if (memberUser == null)
                        continue;
                    if (companyId != null) {
                        boolean sameCompany = memberUser.getMemberships() != null
                                && memberUser.getMemberships().stream()
                                        .anyMatch(m -> m.getCompany() != null
                                                && companyId.equals(m.getCompany().getCompanyId()) && m.getIsActive());
                        if (!sameCompany) {
                            log.warn("Skipping member {} — not in company {}", memberId, companyId);
                            continue;
                        }
                    }

                    ChatRoomMember member = new ChatRoomMember();
                    member.setId(new ChatRoomMemberId(chatRoom.getRoomId(), memberUser.getUserId()));
                    member.setChatRoom(chatRoom);
                    member.setUser(memberUser);
                    member.setRole(ChatRoomMember.MemberRole.MEMBER);
                    member.setJoinedAt(LocalDateTime.now());
                    chatRoomMemberRepository.save(member);
                    log.info("Thêm thành viên {} vào phòng chat {}", memberUser.getUsername(), chatRoom.getName());
                }
            }

            return convertToChatRoomDTO(chatRoom);

        } catch (DataAccessException e) {
            log.error("Database error khi tạo phòng chat cho user {}: {}", currentUser.getUsername(), e.getMessage(),
                    e);
            throw new BadRequestException("Không thể tạo phòng chat do lỗi database");
        } catch (Exception e) {
            log.error("Lỗi không xác định khi tạo phòng chat cho user {}: {} - Class: {}",
                    currentUser.getUsername(), e.getMessage(), e.getClass().getName(), e);
            throw e; // Re-throw để GlobalExceptionHandler xử lý
        }
    }

    public List<ChatRoomDTO> getChatRoomsByUserId(User currentUser) {
        if (!accessControlService.canUseChat(currentUser)) {
            throw new ForbiddenException("Admin không có quyền sử dụng chat");
        }

        List<ChatRoomMember> memberships = chatRoomMemberRepository.findByUser_UserId(currentUser.getUserId());
        return memberships.stream()
                .map(membership -> convertToChatRoomDTO(membership.getChatRoom()))
                .collect(Collectors.toList());
    }

    public org.springframework.data.domain.Page<ChatRoomDTO> getChatRoomsByUserIdPaged(User currentUser,
            org.springframework.data.domain.Pageable pageable) {
        if (!accessControlService.canUseChat(currentUser)) {
            throw new ForbiddenException("Admin không có quyền sử dụng chat");
        }

        // Sử dụng repo query mới đã add
        org.springframework.data.domain.Page<ChatRoom> chatRooms = chatRoomRepository
                .findChatRoomsByUserIdPaginated(currentUser.getUserId(), pageable);
        return chatRooms.map(this::convertToChatRoomDTO);
    }

    public ChatRoomDTO getChatRoomById(Long roomId, Long userId) {
        if (roomId == null || userId == null) {
            throw new BadRequestException("Room ID và User ID không được để trống");
        }
        // Validate phòng chat tồn tại
        ChatRoom chatRoom = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Phòng chat không tồn tại"));

        // Kiểm tra user có trong phòng không
        boolean isMember = chatRoomMemberRepository.existsByChatRoom_RoomIdAndUser_UserId(roomId, userId);
        if (!isMember) {
            throw new BadRequestException("Không có quyền truy cập phòng chat này");
        }

        return convertToChatRoomDTO(chatRoom);
    }

    // OPTIMIZED: Use existing repository query instead of loop
    public ChatRoomDTO findOrCreateDirectChat(Long userId1, Long userId2) {
        if (userId1 == null || userId2 == null) {
            throw new BadRequestException("User ID không được để trống");
        }
        if (userId1.equals(userId2)) {
            throw new BadRequestException("Không thể tạo cuộc trò chuyện với chính mình");
        }

        validateUserInCompany(userId1);
        validateUserInCompany(userId2);

        User user1 = userRepository.findById(userId1)
                .orElseThrow(() -> new ResourceNotFoundException("User 1 không tồn tại"));
        User user2 = userRepository.findById(userId2)
                .orElseThrow(() -> new ResourceNotFoundException("User 2 không tồn tại"));

        // Use optimized repository query instead of looping through all rooms
        Optional<ChatRoom> existingRoom = chatRoomRepository.findDirectChatBetweenUsers(userId1, userId2);
        if (existingRoom.isPresent()) {
            return convertToChatRoomDTO(existingRoom.get());
        }

        // Create new direct chat
        ChatRoom directRoom = new ChatRoom();
        directRoom.setName(user1.getUsername() + " & " + user2.getUsername());
        directRoom.setType(ChatRoom.RoomType.DIRECT);
        directRoom.setCreatedAt(LocalDateTime.now());
        directRoom = chatRoomRepository.save(directRoom);

        ChatRoomMember member1 = new ChatRoomMember();
        member1.setId(new ChatRoomMemberId(directRoom.getRoomId(), user1.getUserId()));
        member1.setChatRoom(directRoom);
        member1.setUser(user1);
        member1.setRole(ChatRoomMember.MemberRole.MEMBER);
        member1.setJoinedAt(LocalDateTime.now());
        chatRoomMemberRepository.save(member1);

        ChatRoomMember member2 = new ChatRoomMember();
        member2.setId(new ChatRoomMemberId(directRoom.getRoomId(), user2.getUserId()));
        member2.setChatRoom(directRoom);
        member2.setUser(user2);
        member2.setRole(ChatRoomMember.MemberRole.MEMBER);
        member2.setJoinedAt(LocalDateTime.now());
        chatRoomMemberRepository.save(member2);

        return convertToChatRoomDTO(directRoom);
    }

    // Thêm thành viên vào phòng chat
    public ChatRoomDTO addMemberToRoom(Long roomId, Long userId, Long adminId) {
        if (roomId == null || userId == null || adminId == null) {
            throw new BadRequestException("Room ID, User ID và Admin ID không được để trống");
        }
        // Validate phòng chat tồn tại
        ChatRoom chatRoom = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Phòng chat không tồn tại"));

        // Kiểm tra admin có quyền thêm thành viên không
        boolean isAdmin = chatRoomMemberRepository.existsByChatRoom_RoomIdAndUser_UserIdAndRole(
                roomId, adminId, ChatRoomMember.MemberRole.ADMIN);
        if (!isAdmin) {
            throw new BadRequestException("Không có quyền thêm thành viên vào phòng chat này");
        }

        // Validate user tồn tại
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));

        validateUserInCompany(userId);

        // Kiểm tra user đã trong phòng chưa
        boolean alreadyMember = chatRoomMemberRepository.existsByChatRoom_RoomIdAndUser_UserId(roomId, userId);
        if (alreadyMember) {
            throw new BadRequestException("User đã là thành viên của phòng chat này");
        }

        ChatRoomMember member = new ChatRoomMember();
        member.setId(new ChatRoomMemberId(chatRoom.getRoomId(), user.getUserId()));
        member.setChatRoom(chatRoom);
        member.setUser(user);
        member.setRole(ChatRoomMember.MemberRole.MEMBER);
        member.setJoinedAt(LocalDateTime.now());
        chatRoomMemberRepository.save(member);

        webSocketNotificationService.notifyUserJoined(roomId, user);

        List<ChatRoomMember> otherMembers = chatRoomMemberRepository.findByChatRoom_RoomId(roomId)
                .stream()
                .filter(m -> m.getUser() != null && !m.getUser().getUserId().equals(user.getUserId()))
                .toList();

        for (ChatRoomMember otherMember : otherMembers) {
            chatNotificationService.createMemberJoinedNotification(
                    otherMember.getUser().getUserId(),
                    user.getUsername(),
                    roomId);
        }

        return convertToChatRoomDTO(chatRoom);
    }

    public ChatRoomDTO removeMemberFromRoom(Long roomId, Long userId, Long adminId) {
        if (roomId == null || userId == null || adminId == null) {
            throw new BadRequestException("Room ID, User ID và Admin ID không được để trống");
        }
        ChatRoom chatRoom = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Phòng chat không tồn tại"));

        boolean isAdmin = chatRoomMemberRepository.existsByChatRoom_RoomIdAndUser_UserIdAndRole(
                roomId, adminId, ChatRoomMember.MemberRole.ADMIN);
        if (!isAdmin) {
            throw new BadRequestException("Bạn không có quyền xóa thành viên khỏi phòng chat này");
        }
        if (userId.equals(adminId)) {
            throw new BadRequestException("Admin không thể tự xóa mình khỏi phòng chat. Hãy chuyển quyền admin trước.");
        }

        ChatRoomMember member = chatRoomMemberRepository.findByChatRoom_RoomIdAndUser_UserId(roomId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("User không phải thành viên của phòng chat này"));

        User removedUser = member.getUser();
        chatRoomMemberRepository.delete(member);

        webSocketNotificationService.notifyUserLeft(roomId, removedUser);

        return convertToChatRoomDTO(chatRoom);
    }

    public void leaveRoom(Long roomId, Long userId) {
        if (roomId == null || userId == null) {
            throw new BadRequestException("Room ID và User ID không được để trống");
        }
        ChatRoom chatRoom = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Phòng chat với ID " + roomId + " không tồn tại"));
        if (chatRoom.getType() == ChatRoom.RoomType.DIRECT) {
            throw new BadRequestException("Không thể rời phòng chat trực tiếp. Hãy xóa cuộc hội thoại thay vào đó.");
        }

        ChatRoomMember member = chatRoomMemberRepository.findByChatRoom_RoomIdAndUser_UserId(roomId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("User không phải thành viên của phòng chat này"));
        if (member.getRole() == ChatRoomMember.MemberRole.ADMIN) {
            long adminCount = chatRoomMemberRepository.findByChatRoom_RoomId(roomId).stream()
                    .filter(m -> m.getRole() == ChatRoomMember.MemberRole.ADMIN)
                    .count();
            if (adminCount <= 1) {
                throw new BadRequestException(
                        "Bạn là admin duy nhất. Hãy chuyển quyền admin cho thành viên khác trước khi rời phòng.");
            }
        }

        User leavingUser = member.getUser();
        chatRoomMemberRepository.delete(member);

        webSocketNotificationService.notifyUserLeft(roomId, leavingUser);

    }

    public ChatRoomDTO changeMemberRole(Long roomId, Long userId, ChatRoomMember.MemberRole newRole, Long adminId) {
        if (roomId == null || userId == null || adminId == null || newRole == null) {
            throw new BadRequestException("Room ID, User ID, Admin ID và Role không được để trống");
        }
        ChatRoom chatRoom = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Phòng chat với ID " + roomId + " không tồn tại"));

        boolean isAdmin = chatRoomMemberRepository.existsByChatRoom_RoomIdAndUser_UserIdAndRole(
                roomId, adminId, ChatRoomMember.MemberRole.ADMIN);
        if (!isAdmin) {
            throw new BadRequestException("Bạn không có quyền thay đổi quyền thành viên trong phòng chat này");
        }

        ChatRoomMember member = chatRoomMemberRepository.findByChatRoom_RoomIdAndUser_UserId(roomId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("User không phải thành viên của phòng chat này"));

        member.setRole(newRole);
        chatRoomMemberRepository.save(member);

        return convertToChatRoomDTO(chatRoom);
    }

    public ChatRoomDTO updateRoomSettings(Long roomId, String name, String avatarUrl, Long adminId) {
        if (roomId == null || adminId == null) {
            throw new BadRequestException("Room ID và Admin ID không được để trống");
        }
        ChatRoom chatRoom = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Phòng chat với ID " + roomId + " không tồn tại"));

        boolean isAdmin = chatRoomMemberRepository.existsByChatRoom_RoomIdAndUser_UserIdAndRole(
                roomId, adminId, ChatRoomMember.MemberRole.ADMIN);
        if (!isAdmin) {
            throw new BadRequestException("Bạn không có quyền cập nhật thông tin phòng chat này");
        }

        if (name != null && !name.trim().isEmpty()) {
            chatRoom.setName(name.trim());
        }
        if (avatarUrl != null) {
            chatRoom.setAvatarUrl(avatarUrl);
        }

        chatRoom = chatRoomRepository.save(chatRoom);

        String updateMessage = "Thông tin phòng chat đã được cập nhật";
        webSocketNotificationService.notifyRoomUpdated(roomId, updateMessage);

        List<ChatRoomMember> members = chatRoomMemberRepository.findByChatRoom_RoomId(roomId);
        for (ChatRoomMember member : members) {
            if (member.getUser() != null) {
                chatNotificationService.createRoomUpdatedNotification(
                        member.getUser().getUserId(),
                        "SETTINGS",
                        updateMessage,
                        roomId);
            }
        }

        return convertToChatRoomDTO(chatRoom);
    }

    public List<ChatRoomMember> getRoomMembers(Long roomId, Long userId) {
        if (roomId == null || userId == null) {
            throw new BadRequestException("Room ID và User ID không được để trống");
        }
        chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Phòng chat với ID " + roomId + " không tồn tại"));

        boolean isMember = chatRoomMemberRepository.existsByChatRoom_RoomIdAndUser_UserId(roomId, userId);
        if (!isMember) {
            throw new BadRequestException("Bạn không có quyền xem danh sách thành viên phòng chat này");
        }

        return chatRoomMemberRepository.findByChatRoom_RoomId(roomId);
    }

    public ChatRoomDTO getProjectChatRoom(Long projectId, Long userId) {
        if (projectId == null || userId == null) {
            throw new BadRequestException("Project ID và User ID không được để trống");
        }

        // Validate project exists
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project không tồn tại"));

        // Get project chat room
        List<ChatRoom> projectChats = chatRoomRepository.findByProject(project);
        if (projectChats.isEmpty()) {
            throw new ResourceNotFoundException("Project chat room không tồn tại");
        }

        ChatRoom chatRoom = projectChats.get(0);

        // Verify user is member
        boolean isMember = chatRoomMemberRepository
                .existsByChatRoom_RoomIdAndUser_UserId(chatRoom.getRoomId(), userId);
        if (!isMember) {
            throw new BadRequestException("Bạn không có quyền truy cập chat room này");
        }

        return convertToChatRoomDTO(chatRoom);
    }

    /**
     * Mark all messages in a room as read for the given user
     * by updating lastReadAt on the ChatRoomMember record.
     */
    public void markRoomAsRead(Long roomId, Long userId) {
        if (roomId == null || userId == null) {
            throw new BadRequestException("Room ID và User ID không được để trống");
        }
        chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Phòng chat không tồn tại"));

        ChatRoomMember member = chatRoomMemberRepository.findByChatRoom_RoomIdAndUser_UserId(roomId, userId)
                .orElseThrow(() -> new BadRequestException("Bạn không phải thành viên của phòng chat này"));

        member.setLastReadAt(LocalDateTime.now());
        chatRoomMemberRepository.save(member);
    }

    private ChatRoomDTO convertToChatRoomDTO(ChatRoom chatRoom) {
        if (chatRoom == null) {
            throw new IllegalArgumentException("ChatRoom không được null");
        }
        ChatRoomDTO dto = new ChatRoomDTO();
        dto.setRoomId(chatRoom.getRoomId());
        dto.setName(chatRoom.getName());
        dto.setRoomType(chatRoom.getType());
        dto.setAvatarUrl(chatRoom.getAvatarUrl());
        dto.setCreatedAt(chatRoom.getCreatedAt());

        // Set creator as lightweight DTO
        if (chatRoom.getCreatedBy() != null) {
            User creator = chatRoom.getCreatedBy();
            dto.setCreatedBy(new ChatRoomDTO.MemberDTO(
                    creator.getUserId(), creator.getUsername(),
                    creator.getEmail(), creator.getAvatarUrl(),
                    creator.getFullName()));
        }

        // Set project info if this is a project chat
        if (chatRoom.getProject() != null) {
            dto.setProjectID(chatRoom.getProject().getProjectId());
            dto.setProjectName(chatRoom.getProject().getName());
        }

        // Fetch members and map to lightweight DTOs (no password, no fcmToken)
        List<ChatRoomMember> memberList = chatRoomMemberRepository.findByChatRoom_RoomId(chatRoom.getRoomId());
        List<ChatRoomDTO.MemberDTO> memberDTOs = memberList.stream()
                .map(ChatRoomMember::getUser)
                .filter(user -> user != null)
                .map(user -> new ChatRoomDTO.MemberDTO(
                        user.getUserId(), user.getUsername(),
                        user.getEmail(), user.getAvatarUrl(),
                        user.getFullName()))
                .collect(Collectors.toList());
        dto.setMembers(memberDTOs);
        dto.setMemberCount(memberDTOs.size());

        // Fetch and set last message as lightweight DTO
        Message lastMessage = messageRepository.findTopByChatRoom_RoomIdOrderByCreatedAtDesc(chatRoom.getRoomId());
        if (lastMessage != null) {
            ChatRoomDTO.LastMessageDTO lastMsgDTO = new ChatRoomDTO.LastMessageDTO();
            lastMsgDTO.setMessageId(lastMessage.getMessageId());
            lastMsgDTO.setContent(lastMessage.getContent());
            lastMsgDTO.setCreatedAt(lastMessage.getCreatedAt());
            lastMsgDTO.setMessageType(lastMessage.getMessageType() != null
                    ? lastMessage.getMessageType().name()
                    : null);
            if (lastMessage.getSender() != null) {
                lastMsgDTO.setSenderUsername(lastMessage.getSender().getUsername());
                lastMsgDTO.setSenderId(lastMessage.getSender().getUserId());
            }
            dto.setLastMessage(lastMsgDTO);
            dto.setLastMessageAt(lastMessage.getCreatedAt());
        }

        return dto;
    }
}
