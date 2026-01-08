package DoAn.BE.chat.controller;

import DoAn.BE.chat.dto.MeetingDTO;
import DoAn.BE.chat.service.MeetingService;

import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/meetings")
@RequiredArgsConstructor
public class MeetingController {

    private final MeetingService meetingService;

    @PostMapping
    public ResponseEntity<MeetingDTO.MeetingResponse> createMeeting(
            @AuthenticationPrincipal User currentUser,
            @RequestBody MeetingDTO.CreateMeetingRequest request) {
        return ResponseEntity.ok(meetingService.createMeeting(currentUser.getUserId(), request));
    }

    @GetMapping("/room/{roomId}/active")
    public ResponseEntity<List<MeetingDTO.MeetingResponse>> getActiveMeetings(@PathVariable Long roomId) {
        return ResponseEntity.ok(meetingService.getActiveMeetings(roomId));
    }

    @PostMapping("/{meetingId}/join")
    public ResponseEntity<Void> joinMeeting(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long meetingId) {
        User user = new User();
        user.setUserId(currentUser.getUserId());
        meetingService.joinMeeting(meetingId, user);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{meetingId}/end")
    public ResponseEntity<Void> endMeeting(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long meetingId) {
        meetingService.endMeeting(meetingId, currentUser.getUserId());
        return ResponseEntity.ok().build();
    }
}
