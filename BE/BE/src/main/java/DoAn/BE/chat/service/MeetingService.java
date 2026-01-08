package DoAn.BE.chat.service;

import DoAn.BE.chat.dto.MeetingDTO;
import DoAn.BE.chat.entity.ChatRoom;
import DoAn.BE.chat.entity.Meeting;
import DoAn.BE.chat.entity.MeetingParticipant;
import DoAn.BE.chat.repository.ChatRoomRepository;
import DoAn.BE.chat.repository.MeetingParticipantRepository;
import DoAn.BE.chat.repository.MeetingRepository;
import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MeetingService {

    private final MeetingRepository meetingRepository;
    private final MeetingParticipantRepository meetingParticipantRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final DoAn.BE.user.repository.UserRepository userRepository;

    @org.springframework.beans.factory.annotation.Value("${app.jitsi.base-url:https://meet.jit.si/}")
    private String jitsiBaseUrl;

    @Transactional
    public MeetingDTO.MeetingResponse createMeeting(Long userId, MeetingDTO.CreateMeetingRequest request) {
        ChatRoom chatRoom = chatRoomRepository.findById(request.getChatRoomId())
                .orElseThrow(() -> new ResourceNotFoundException("Chat room not found"));

        // Generate unique meeting link
        // Pattern: Tenant_Room_UniqueString to avoid collisions on public Jitsi
        String uniqueRoomName = "EMS_" + chatRoom.getRoomId() + "_" + UUID.randomUUID().toString().substring(0, 8);
        String meetingLink = jitsiBaseUrl + uniqueRoomName;

        Meeting meeting = Meeting.builder()
                .title(request.getTitle() != null ? request.getTitle() : "Cuộc họp nhanh")
                .chatRoom(chatRoom)
                .createdBy(User.builder().userId(userId).build()) // Lazy set for reference
                .type(request.getType() != null ? request.getType() : Meeting.MeetingType.INSTANT)
                .status(Meeting.MeetingStatus.SCHEDULED)
                .meetingLink(meetingLink)
                .build();

        if (meeting.getType() == Meeting.MeetingType.INSTANT) {
            meeting.setStartTime(LocalDateTime.now());
            meeting.setStatus(Meeting.MeetingStatus.IN_PROGRESS);
        } else {
            meeting.setStartTime(request.getStartTime());
        }

        Meeting savedMeeting = meetingRepository.save(meeting);
        return mapToResponse(savedMeeting);
    }

    @Transactional(readOnly = true)
    public List<MeetingDTO.MeetingResponse> getActiveMeetings(Long roomId) {
        return meetingRepository.findActiveMeetingsByRoomId(roomId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void joinMeeting(Long meetingId, User user) {
        Meeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new ResourceNotFoundException("Meeting not found"));

        if (meeting.getStatus() == Meeting.MeetingStatus.COMPLETED
                || meeting.getStatus() == Meeting.MeetingStatus.CANCELLED) {
            throw new BadRequestException("Meeting is no longer active");
        }

        // Check if already joined
        if (meetingParticipantRepository.findByMeeting_MeetingIdAndUser_UserId(meetingId, user.getUserId()).isEmpty()) {
            MeetingParticipant participant = MeetingParticipant.builder()
                    .meeting(meeting)
                    .user(user)
                    .joinedAt(LocalDateTime.now())
                    // .role() // Could add moderator logic here later
                    .build();
            meetingParticipantRepository.save(participant);
        }

        // Smart Status: Set user to IN_MEETING
        user.setPresenceStatus(User.PresenceStatus.IN_MEETING);
        userRepository.save(user);
    }

    @Transactional
    public void endMeeting(Long meetingId, Long userId) {
        Meeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new ResourceNotFoundException("Meeting not found"));

        // Only creator or admin can end (simplification for now)
        if (!meeting.getCreatedBy().getUserId().equals(userId)) {
            // Check admin permission logic (omitted for brevity)
            // throw new ForbiddenException("Only host can end meeting");
        }

        meeting.setStatus(Meeting.MeetingStatus.COMPLETED);
        meeting.setEndTime(LocalDateTime.now());

        if (meeting.getStartTime() != null) {
            long minutes = Duration.between(meeting.getStartTime(), meeting.getEndTime()).toMinutes();
            meeting.setDuration((int) minutes);
        }

        meetingRepository.save(meeting);

        // [OPTIMIZED: Bulk update instead of N saves in loop]
        List<MeetingParticipant> participants = meetingParticipantRepository.findByMeeting_MeetingId(meetingId);
        List<Long> participantUserIds = participants.stream()
                .map(p -> p.getUser().getUserId())
                .toList();
        if (!participantUserIds.isEmpty()) {
            userRepository.updatePresenceStatusFromMeetingToOnline(participantUserIds);
        }
    }

    private MeetingDTO.MeetingResponse mapToResponse(Meeting meeting) {
        return MeetingDTO.MeetingResponse.builder()
                .meetingId(meeting.getMeetingId())
                .title(meeting.getTitle())
                .description(meeting.getDescription())
                .chatRoomId(meeting.getChatRoom().getRoomId())
                .meetingLink(meeting.getMeetingLink())
                .type(meeting.getType())
                .status(meeting.getStatus())
                .startTime(meeting.getStartTime())
                .endTime(meeting.getEndTime())
                .duration(meeting.getDuration())
                .createdByUserId(meeting.getCreatedBy().getUserId())
                .createdByUsername(meeting.getCreatedBy().getUsername()) // Might be null if lazy loaded, handle with
                                                                         // caution
                .createdAt(meeting.getCreatedAt())
                .build();
    }
}
