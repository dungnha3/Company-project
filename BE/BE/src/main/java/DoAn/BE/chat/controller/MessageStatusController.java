package DoAn.BE.chat.controller;

import DoAn.BE.chat.service.MessageStatusService;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class MessageStatusController {

    private final MessageStatusService messageStatusService;

    // [Lấy số tin nhắn chưa đọc] (Role: User)
    @GetMapping("/rooms/{roomId}/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(
            @PathVariable Long roomId,
            @AuthenticationPrincipal User currentUser) {
        if (roomId == null) {
            throw new IllegalArgumentException("Room ID không được null");
        }
        Long unreadCount = messageStatusService.getUnreadCount(roomId, currentUser.getUserId());

        Map<String, Long> response = new HashMap<>();
        response.put("unreadCount", unreadCount);
        return ResponseEntity.ok(response);
    }
}
