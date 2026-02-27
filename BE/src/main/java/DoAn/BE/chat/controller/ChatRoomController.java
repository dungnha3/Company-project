package DoAn.BE.chat.controller;

import DoAn.BE.chat.dto.ChatRoomDTO;
import DoAn.BE.chat.dto.CreateChatRoomRequest;
import DoAn.BE.chat.entity.ChatRoomMember;
import DoAn.BE.chat.service.ChatRoomService;
import DoAn.BE.user.entity.User;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

import DoAn.BE.common.annotation.FeatureFlag;
@RestController
@RequestMapping("/api/chat/rooms")
@RequiredArgsConstructor
@FeatureFlag("CHAT")
public class ChatRoomController {

    private final ChatRoomService chatRoomService;
    @PostMapping
    public ResponseEntity<ChatRoomDTO> createChatRoom(
            @Valid @RequestBody CreateChatRoomRequest request,
            @AuthenticationPrincipal User currentUser) {
        ChatRoomDTO chatRoom = chatRoomService.createChatRoom(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(chatRoom);
    }
    @PostMapping("/direct/{userId}")
    public ResponseEntity<ChatRoomDTO> createDirectChat(
            @PathVariable Long userId,
            @AuthenticationPrincipal User currentUser) {
        ChatRoomDTO chatRoom = chatRoomService.findOrCreateDirectChat(currentUser.getUserId(), userId);
        return ResponseEntity.ok(chatRoom);
    }
    @GetMapping
    public ResponseEntity<org.springframework.data.domain.Page<ChatRoomDTO>> getMyChatRooms(
            @AuthenticationPrincipal User currentUser,
            org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<ChatRoomDTO> chatRooms = chatRoomService
                .getChatRoomsByUserIdPaged(currentUser, pageable);
        return ResponseEntity.ok(chatRooms);
    }
    @GetMapping("/{roomId}")
    public ResponseEntity<ChatRoomDTO> getChatRoom(
            @PathVariable Long roomId,
            @AuthenticationPrincipal User currentUser) {
        ChatRoomDTO chatRoom = chatRoomService.getChatRoomById(roomId, currentUser.getUserId());
        return ResponseEntity.ok(chatRoom);
    }
    @GetMapping("/project/{projectId}")
    public ResponseEntity<ChatRoomDTO> getProjectChatRoom(
            @PathVariable Long projectId,
            @AuthenticationPrincipal User currentUser) {
        ChatRoomDTO chatRoom = chatRoomService.getProjectChatRoom(projectId, currentUser.getUserId());
        return ResponseEntity.ok(chatRoom);
    }
    @GetMapping("/{roomId}/members")
    public ResponseEntity<List<ChatRoomMember>> getRoomMembers(
            @PathVariable Long roomId,
            @AuthenticationPrincipal User currentUser) {
        List<ChatRoomMember> members = chatRoomService.getRoomMembers(roomId, currentUser.getUserId());
        return ResponseEntity.ok(members);
    }
    @PostMapping("/{roomId}/members/{userId}")
    public ResponseEntity<ChatRoomDTO> addMemberToRoom(
            @PathVariable Long roomId,
            @PathVariable Long userId,
            @AuthenticationPrincipal User currentUser) {
        ChatRoomDTO chatRoom = chatRoomService.addMemberToRoom(roomId, userId, currentUser.getUserId());
        return ResponseEntity.ok(chatRoom);
    }
    @DeleteMapping("/{roomId}/members/{userId}")
    public ResponseEntity<ChatRoomDTO> removeMemberFromRoom(
            @PathVariable Long roomId,
            @PathVariable Long userId,
            @AuthenticationPrincipal User currentUser) {
        ChatRoomDTO chatRoom = chatRoomService.removeMemberFromRoom(roomId, userId, currentUser.getUserId());
        return ResponseEntity.ok(chatRoom);
    }
    @PutMapping("/{roomId}/members/{userId}/role")
    public ResponseEntity<ChatRoomDTO> changeMemberRole(
            @PathVariable Long roomId,
            @PathVariable Long userId,
            @RequestParam String role,
            @AuthenticationPrincipal User currentUser) {
        ChatRoomMember.MemberRole memberRole = ChatRoomMember.MemberRole.valueOf(role.toUpperCase());
        ChatRoomDTO chatRoom = chatRoomService.changeMemberRole(roomId, userId, memberRole, currentUser.getUserId());
        return ResponseEntity.ok(chatRoom);
    }
    @DeleteMapping("/{roomId}/leave")
    public ResponseEntity<Map<String, String>> leaveRoom(
            @PathVariable Long roomId,
            @AuthenticationPrincipal User currentUser) {
        chatRoomService.leaveRoom(roomId, currentUser.getUserId());
        Map<String, String> response = new HashMap<>();
        response.put("message", "Đã rời khỏi phòng chat");
        return ResponseEntity.ok(response);
    }
    @PutMapping("/{roomId}/settings")
    public ResponseEntity<ChatRoomDTO> updateRoomSettings(
            @PathVariable Long roomId,
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal User currentUser) {
        String name = request.get("name");
        String avatarUrl = request.get("avatarUrl");
        ChatRoomDTO chatRoom = chatRoomService.updateRoomSettings(roomId, name, avatarUrl, currentUser.getUserId());
        return ResponseEntity.ok(chatRoom);
    }
}
