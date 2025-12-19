package DoAn.BE.chat.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import DoAn.BE.chat.dto.CreateMeetingRequest;
import DoAn.BE.chat.dto.MeetingDTO;
import DoAn.BE.chat.service.MeetingService;
import DoAn.BE.user.entity.User;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/meetings")
@RequiredArgsConstructor
public class MeetingController {

    private final MeetingService meetingService;

    // Tạo cuộc họp mới
    @PostMapping
    public ResponseEntity<MeetingDTO> createMeeting(
            @RequestBody CreateMeetingRequest request,
            @AuthenticationPrincipal User user) {
        MeetingDTO meeting = meetingService.createMeeting(request, user.getUserId());
        return ResponseEntity.ok(meeting);
    }

    // Lấy danh sách cuộc họp của room
    @GetMapping("/room/{roomId}")
    public ResponseEntity<List<MeetingDTO>> getMeetingsByRoom(@PathVariable Long roomId) {
        List<MeetingDTO> meetings = meetingService.getMeetingsByRoom(roomId);
        return ResponseEntity.ok(meetings);
    }

    // Lấy danh sách cuộc họp sắp tới
    @GetMapping("/upcoming")
    public ResponseEntity<List<MeetingDTO>> getUpcomingMeetings(@AuthenticationPrincipal User user) {
        List<MeetingDTO> meetings = meetingService.getUpcomingMeetings(user.getUserId());
        return ResponseEntity.ok(meetings);
    }

    // Lấy thông tin cuộc họp theo ID
    @GetMapping("/{meetingId}")
    public ResponseEntity<MeetingDTO> getMeetingById(@PathVariable Long meetingId) {
        MeetingDTO meeting = meetingService.getMeetingById(meetingId);
        return ResponseEntity.ok(meeting);
    }

    // Tham gia cuộc họp
    @PostMapping("/{meetingId}/join")
    public ResponseEntity<MeetingDTO> joinMeeting(
            @PathVariable Long meetingId,
            @AuthenticationPrincipal User user) {
        MeetingDTO meeting = meetingService.joinMeeting(meetingId, user.getUserId());
        return ResponseEntity.ok(meeting);
    }

    // Rời khỏi cuộc họp
    @PostMapping("/{meetingId}/leave")
    public ResponseEntity<?> leaveMeeting(
            @PathVariable Long meetingId,
            @AuthenticationPrincipal User user) {
        MeetingDTO meeting = meetingService.leaveMeeting(meetingId, user.getUserId());
        if (meeting == null) {
            // Meeting has been deleted because no one is left
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(meeting);
    }

    // Kết thúc cuộc họp
    @PostMapping("/{meetingId}/end")
    public ResponseEntity<MeetingDTO> endMeeting(
            @PathVariable Long meetingId,
            @AuthenticationPrincipal User user) {
        MeetingDTO meeting = meetingService.endMeeting(meetingId, user.getUserId());
        return ResponseEntity.ok(meeting);
    }

    // Hủy cuộc họp
    @DeleteMapping("/{meetingId}")
    public ResponseEntity<Void> cancelMeeting(
            @PathVariable Long meetingId,
            @AuthenticationPrincipal User user) {
        meetingService.cancelMeeting(meetingId, user.getUserId());
        return ResponseEntity.noContent().build();
    }
}
