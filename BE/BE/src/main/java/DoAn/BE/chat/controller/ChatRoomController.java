package DoAn.BE.chat.controller;

import DoAn.BE.chat.dto.ChatRoomDTO;
import DoAn.BE.chat.dto.CreateChatRoomRequest;
import DoAn.BE.chat.entity.ChatRoomMember;
import DoAn.BE.chat.service.ChatRoomService;
import DoAn.BE.common.exception.EntityNotFoundException;
import DoAn.BE.common.exception.UnauthorizedException;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/chat/rooms")
@CrossOrigin(origins = "*")
public class ChatRoomController {

    @Autowired
    private ChatRoomService chatRoomService;

    @Autowired
    private UserRepository userRepository;

    // Lấy thông tin user hiện tại từ Security Context
    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UnauthorizedException("User chưa đăng nhập");
        }

        // Get User from principal (set by JwtAuthenticationFilter)
        Object principal = authentication.getPrincipal();
        if (principal instanceof User) {
            return (User) principal;
        }

        // Fallback: try to find by username
        String username = authentication.getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new EntityNotFoundException("User không tồn tại"));
    }

    // Tạo phòng chat mới
    @PostMapping
    public ResponseEntity<ChatRoomDTO> createChatRoom(@Valid @RequestBody CreateChatRoomRequest request) {
        User currentUser = getCurrentUser();
        ChatRoomDTO chatRoom = chatRoomService.createChatRoom(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(chatRoom);
    }

    // Lấy danh sách phòng chat của user hiện tại
    @GetMapping
    public ResponseEntity<List<ChatRoomDTO>> getMyChatRooms() {
        User currentUser = getCurrentUser();
        List<ChatRoomDTO> chatRooms = chatRoomService.getChatRoomsByUserId(currentUser);
        return ResponseEntity.ok(chatRooms);
    }

    // Lấy thông tin phòng chat theo ID
    @GetMapping("/{roomId}")
    public ResponseEntity<ChatRoomDTO> getChatRoom(@PathVariable Long roomId) {
        User currentUser = getCurrentUser();
        ChatRoomDTO chatRoom = chatRoomService.getChatRoomById(roomId, currentUser.getUserId());
        return ResponseEntity.ok(chatRoom);
    }

    // Tìm hoặc tạo chat 1-1 với user khác
    @PostMapping("/direct/{userId}")
    public ResponseEntity<ChatRoomDTO> createDirectChat(@PathVariable Long userId) {
        User currentUser = getCurrentUser();
        ChatRoomDTO chatRoom = chatRoomService.findOrCreateDirectChat(currentUser.getUserId(), userId);
        return ResponseEntity.ok(chatRoom);
    }

    // Thêm thành viên vào phòng chat
    @PostMapping("/{roomId}/members/{userId}")
    public ResponseEntity<ChatRoomDTO> addMemberToRoom(
            @PathVariable Long roomId,
            @PathVariable Long userId) {
        User currentUser = getCurrentUser();
        ChatRoomDTO chatRoom = chatRoomService.addMemberToRoom(roomId, userId, currentUser.getUserId());
        return ResponseEntity.ok(chatRoom);
    }

    // Xóa thành viên khỏi phòng chat
    @DeleteMapping("/{roomId}/members/{userId}")
    public ResponseEntity<ChatRoomDTO> removeMemberFromRoom(
            @PathVariable Long roomId,
            @PathVariable Long userId) {
        User currentUser = getCurrentUser();
        ChatRoomDTO chatRoom = chatRoomService.removeMemberFromRoom(roomId, userId, currentUser.getUserId());
        return ResponseEntity.ok(chatRoom);
    }

    // Rời khỏi phòng chat
    @DeleteMapping("/{roomId}/leave")
    public ResponseEntity<Map<String, String>> leaveRoom(@PathVariable Long roomId) {
        User currentUser = getCurrentUser();
        chatRoomService.leaveRoom(roomId, currentUser.getUserId());

        Map<String, String> response = new HashMap<>();
        response.put("message", "Đã rời khỏi phòng chat");
        return ResponseEntity.ok(response);
    }

    // Thay đổi quyền thành viên
    @PutMapping("/{roomId}/members/{userId}/role")
    public ResponseEntity<ChatRoomDTO> changeMemberRole(
            @PathVariable Long roomId,
            @PathVariable Long userId,
            @RequestParam String role) {
        User currentUser = getCurrentUser();
        ChatRoomMember.MemberRole memberRole = ChatRoomMember.MemberRole.valueOf(role.toUpperCase());
        ChatRoomDTO chatRoom = chatRoomService.changeMemberRole(roomId, userId, memberRole, currentUser.getUserId());
        return ResponseEntity.ok(chatRoom);
    }

    // Cập nhật thông tin phòng chat
    @PutMapping("/{roomId}/settings")
    public ResponseEntity<ChatRoomDTO> updateRoomSettings(
            @PathVariable Long roomId,
            @RequestBody Map<String, String> request) {
        User currentUser = getCurrentUser();
        String name = request.get("name");
        String avatarUrl = request.get("avatarUrl");
        ChatRoomDTO chatRoom = chatRoomService.updateRoomSettings(roomId, name, avatarUrl, currentUser.getUserId());
        return ResponseEntity.ok(chatRoom);
    }

    // Lấy danh sách thành viên trong phòng
    @GetMapping("/{roomId}/members")
    public ResponseEntity<List<ChatRoomMember>> getRoomMembers(@PathVariable Long roomId) {
        User currentUser = getCurrentUser();
        List<ChatRoomMember> members = chatRoomService.getRoomMembers(roomId, currentUser.getUserId());
        return ResponseEntity.ok(members);
    }

    // Lấy project chat room theo projectId
    @GetMapping("/project/{projectId}")
    public ResponseEntity<ChatRoomDTO> getProjectChatRoom(@PathVariable Long projectId) {
        User currentUser = getCurrentUser();
        ChatRoomDTO chatRoom = chatRoomService.getProjectChatRoom(projectId, currentUser.getUserId());
        return ResponseEntity.ok(chatRoom);
    }
}
