package DoAn.BE.chat.controller;

import DoAn.BE.chat.repository.ChatRoomMemberRepository;
import DoAn.BE.chat.service.TypingIndicatorService;
import DoAn.BE.common.exception.UnauthorizedException;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat/rooms")
@RequiredArgsConstructor
public class TypingController {

    private final TypingIndicatorService typingIndicatorService;
    private final ChatRoomMemberRepository chatRoomMemberRepository;

    // [Bắt đầu typing indicator] (Role: User)
    @PostMapping("/{roomId}/typing/start")
    public ResponseEntity<Map<String, String>> startTyping(
            @PathVariable Long roomId,
            @AuthenticationPrincipal User currentUser) {
        if (roomId == null) {
            throw new IllegalArgumentException("Room ID không được null");
        }
        typingIndicatorService.startTyping(roomId, currentUser.getUserId());

        Map<String, String> response = new HashMap<>();
        response.put("message", "Started typing");
        return ResponseEntity.ok(response);
    }

    // [Dừng typing indicator] (Role: User)
    @PostMapping("/{roomId}/typing/stop")
    public ResponseEntity<Map<String, String>> stopTyping(
            @PathVariable Long roomId,
            @AuthenticationPrincipal User currentUser) {
        if (roomId == null) {
            throw new IllegalArgumentException("Room ID không được null");
        }
        typingIndicatorService.stopTyping(roomId, currentUser.getUserId());

        Map<String, String> response = new HashMap<>();
        response.put("message", "Stopped typing");
        return ResponseEntity.ok(response);
    }

    // [Lấy danh sách user đang typing] (Role: User)
    @GetMapping("/{roomId}/typing")
    public ResponseEntity<Map<String, Object>> getTypingUsers(
            @PathVariable Long roomId,
            @AuthenticationPrincipal User currentUser) {
        if (roomId == null) {
            throw new IllegalArgumentException("Room ID không được null");
        }

        // Validate user có trong phòng không
        boolean isMember = chatRoomMemberRepository.existsByChatRoom_RoomIdAndUser_UserId(roomId,
                currentUser.getUserId());
        if (!isMember) {
            throw new UnauthorizedException("Bạn không có quyền xem thông tin phòng chat này");
        }

        List<String> typingUsers = typingIndicatorService.getTypingUsers(roomId);

        Map<String, Object> response = new HashMap<>();
        response.put("typingUsers", typingUsers);

        return ResponseEntity.ok(response);
    }
}
