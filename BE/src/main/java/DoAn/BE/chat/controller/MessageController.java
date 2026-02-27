package DoAn.BE.chat.controller;

import DoAn.BE.common.annotation.FeatureFlag;

import DoAn.BE.chat.dto.MessDTO;
import DoAn.BE.chat.dto.SendMessageRequest;
import DoAn.BE.chat.service.MessageService;
import DoAn.BE.chat.service.ReactionService;
import DoAn.BE.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@FeatureFlag("CHAT")
public class MessageController {

    private final MessageService messageService;
    private final ReactionService reactionService;

    @PostMapping("/rooms/{roomId}/messages")
    public ResponseEntity<MessDTO> sendMessage(
            @PathVariable Long roomId,
            @Valid @RequestBody SendMessageRequest request,
            @AuthenticationPrincipal User currentUser) {
        if (roomId == null) {
            throw new IllegalArgumentException("Room ID không được null");
        }
        request.setRoomId(roomId);
        MessDTO message = messageService.sendMessage(request, currentUser.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(message);
    }

    @GetMapping("/rooms/{roomId}/messages")
    public ResponseEntity<Page<MessDTO>> getMessages(
            @PathVariable Long roomId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @AuthenticationPrincipal User currentUser) {
        if (roomId == null) {
            throw new IllegalArgumentException("Room ID không được null");
        }
        Pageable pageable = PageRequest.of(page, size);
        List<MessDTO> messages = messageService.getMessagesByRoomId(roomId, currentUser.getUserId(), page, size);
        Page<MessDTO> pageMessages = new PageImpl<>(messages, pageable, messages.size());
        return ResponseEntity.ok(pageMessages);
    }

    @PutMapping("/messages/{messageId}/seen")
    public ResponseEntity<Map<String, String>> markMessageAsSeen(
            @PathVariable Long messageId,
            @AuthenticationPrincipal User currentUser) {
        if (messageId == null) {
            throw new IllegalArgumentException("Message ID không được null");
        }
        messageService.markMessageAsSeen(messageId, currentUser.getUserId());

        Map<String, String> response = new HashMap<>();
        response.put("message", "Đã đánh dấu tin nhắn đã xem");
        return ResponseEntity.ok(response);
    }

    @PutMapping("/messages/{messageId}")
    public ResponseEntity<MessDTO> editMessage(
            @PathVariable Long messageId,
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal User currentUser) {
        if (messageId == null) {
            throw new IllegalArgumentException("Message ID không được null");
        }
        String newContent = request.get("content");
        MessDTO message = messageService.editMessage(messageId, newContent, currentUser.getUserId());
        return ResponseEntity.ok(message);
    }

    @DeleteMapping("/messages/{messageId}")
    public ResponseEntity<Map<String, String>> deleteMessage(
            @PathVariable Long messageId,
            @AuthenticationPrincipal User currentUser) {
        if (messageId == null) {
            throw new IllegalArgumentException("Message ID không được null");
        }
        messageService.deleteMessage(messageId, currentUser.getUserId());

        Map<String, String> response = new HashMap<>();
        response.put("message", "Tin nhắn đã được xóa");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/rooms/{roomId}/search")
    public ResponseEntity<List<MessDTO>> searchMessages(
            @PathVariable Long roomId,
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal User currentUser) {
        Pageable pageable = PageRequest.of(page, size);
        List<MessDTO> messages = messageService.searchMessages(roomId, keyword, currentUser.getUserId(), pageable);
        return ResponseEntity.ok(messages);
    }

    // Thêm reaction (emoji) vào tin nhắn
    @PostMapping("/messages/{messageId}/reactions")
    public ResponseEntity<Map<String, String>> addReaction(
            @PathVariable Long messageId,
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal User currentUser) {
        String emoji = request.get("emoji");
        reactionService.addReaction(messageId, currentUser.getUserId(), emoji);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Đã thêm reaction");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/messages/{messageId}/reactions/{emoji}")
    public ResponseEntity<Map<String, String>> removeReaction(
            @PathVariable Long messageId,
            @PathVariable String emoji,
            @AuthenticationPrincipal User currentUser) {
        reactionService.removeReaction(messageId, currentUser.getUserId(), emoji);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Đã xóa reaction");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/messages/{messageId}/reactions")
    public ResponseEntity<Map<String, List<String>>> getReactions(
            @PathVariable Long messageId) {
        Map<String, List<String>> reactions = reactionService.getReactionsByMessageId(messageId);
        return ResponseEntity.ok(reactions);
    }
}