package DoAn.BE.chat.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import DoAn.BE.chat.dto.CreateMeetingRequest;
import DoAn.BE.chat.dto.MeetingDTO;
import DoAn.BE.chat.entity.ChatRoom;
import DoAn.BE.chat.entity.Meeting;
import DoAn.BE.chat.entity.Meeting.MeetingStatus;
import DoAn.BE.chat.entity.Meeting.MeetingType;
import DoAn.BE.chat.entity.MeetingParticipant;
import DoAn.BE.chat.entity.MeetingParticipant.ParticipantStatus;
import DoAn.BE.chat.repository.ChatRoomRepository;
import DoAn.BE.chat.repository.MeetingParticipantRepository;
import DoAn.BE.chat.repository.MeetingRepository;
import DoAn.BE.common.exception.EntityNotFoundException;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MeetingService {

    private final MeetingRepository meetingRepository;
    private final MeetingParticipantRepository participantRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final UserRepository userRepository;

    @Transactional
    public MeetingDTO createMeeting(CreateMeetingRequest request, Long userId) {
        // Get user
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        // Get chat room
        ChatRoom chatRoom = chatRoomRepository.findById(request.getRoomId())
                .orElseThrow(() -> new EntityNotFoundException("Chat room not found"));

        // Determine meeting type
        MeetingType type = MeetingType.SCHEDULED;
        if ("INSTANT".equalsIgnoreCase(request.getType())) {
            type = MeetingType.INSTANT;
        }

        // Create meeting
        Meeting meeting = Meeting.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .chatRoom(chatRoom)
                .createdBy(user)
                .startTime(request.getStartTime() != null ? request.getStartTime() : LocalDateTime.now())
                .duration(request.getDuration() != null ? request.getDuration() : 60)
                .type(type)
                .status(type == MeetingType.INSTANT ? MeetingStatus.IN_PROGRESS : MeetingStatus.SCHEDULED)
                .meetingLink(generateMeetingLink())
                .participants(new ArrayList<>())
                .build();

        meeting = meetingRepository.save(meeting);

        // Add creator as participant
        addParticipant(meeting, user, ParticipantStatus.JOINED);

        // Add other participants if specified
        if (request.getParticipantIds() != null) {
            for (Long participantId : request.getParticipantIds()) {
                if (!participantId.equals(userId)) {
                    User participant = userRepository.findById(participantId).orElse(null);
                    if (participant != null) {
                        addParticipant(meeting, participant, ParticipantStatus.INVITED);
                    }
                }
            }
        }

        return toDTO(meeting);
    }

    private void addParticipant(Meeting meeting, User user, ParticipantStatus status) {
        MeetingParticipant participant = MeetingParticipant.builder()
                .meeting(meeting)
                .user(user)
                .status(status)
                .build();

        if (status == ParticipantStatus.JOINED) {
            participant.setJoinedAt(LocalDateTime.now());
        }

        participantRepository.save(participant);
        meeting.getParticipants().add(participant);
    }

    public List<MeetingDTO> getMeetingsByRoom(Long roomId) {
        List<Meeting> meetings = meetingRepository.findByChatRoom_RoomIdOrderByStartTimeDesc(roomId);
        return meetings.stream().map(this::toDTO).collect(Collectors.toList());
    }

    public List<MeetingDTO> getUpcomingMeetings(Long userId) {
        List<Meeting> meetings = meetingRepository.findUpcomingMeetingsByUserId(userId, LocalDateTime.now());
        return meetings.stream().map(this::toDTO).collect(Collectors.toList());
    }

    public MeetingDTO getMeetingById(Long meetingId) {
        Meeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new EntityNotFoundException("Meeting not found"));
        return toDTO(meeting);
    }

    @Transactional
    public MeetingDTO joinMeeting(Long meetingId, Long userId) {
        Meeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new EntityNotFoundException("Meeting not found"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        // Check if already a participant
        MeetingParticipant participant = participantRepository
                .findByMeeting_MeetingIdAndUser_UserId(meetingId, userId)
                .orElse(null);

        if (participant != null) {
            participant.setStatus(ParticipantStatus.JOINED);
            participant.setJoinedAt(LocalDateTime.now());
            participantRepository.save(participant);
        } else {
            addParticipant(meeting, user, ParticipantStatus.JOINED);
        }

        return toDTO(meeting);
    }

    @Transactional
    public MeetingDTO leaveMeeting(Long meetingId, Long userId) {
        Meeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new EntityNotFoundException("Meeting not found"));

        MeetingParticipant participant = participantRepository
                .findByMeeting_MeetingIdAndUser_UserId(meetingId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Participant not found"));

        participant.setStatus(ParticipantStatus.LEFT);
        participant.setLeftAt(LocalDateTime.now());
        participantRepository.save(participant);

        // Check if there are any participants still in the meeting
        long activeParticipants = meeting.getParticipants().stream()
                .filter(p -> p.getStatus() == ParticipantStatus.JOINED)
                .count();

        // If no one is left in the meeting, delete it
        if (activeParticipants == 0) {
            // Delete all participants first
            participantRepository.deleteAll(meeting.getParticipants());
            // Then delete the meeting
            meetingRepository.delete(meeting);
            return null; // Meeting has been deleted
        }

        return toDTO(meeting);
    }

    @Transactional
    public MeetingDTO endMeeting(Long meetingId, Long userId) {
        Meeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new EntityNotFoundException("Meeting not found"));

        // Only creator can end meeting
        if (!meeting.getCreatedBy().getUserId().equals(userId)) {
            throw new RuntimeException("Only the meeting creator can end the meeting");
        }

        meeting.setStatus(MeetingStatus.COMPLETED);
        meeting.setEndTime(LocalDateTime.now());
        meetingRepository.save(meeting);

        return toDTO(meeting);
    }

    @Transactional
    public void cancelMeeting(Long meetingId, Long userId) {
        Meeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new EntityNotFoundException("Meeting not found"));

        // Only creator can cancel meeting
        if (!meeting.getCreatedBy().getUserId().equals(userId)) {
            throw new RuntimeException("Only the meeting creator can cancel the meeting");
        }

        meeting.setStatus(MeetingStatus.CANCELLED);
        meetingRepository.save(meeting);
    }

    private String generateMeetingLink() {
        return "meet-" + UUID.randomUUID().toString().substring(0, 8);
    }

    private MeetingDTO toDTO(Meeting meeting) {
        List<MeetingDTO.ParticipantDTO> participantDTOs = meeting.getParticipants().stream()
                .map(p -> MeetingDTO.ParticipantDTO.builder()
                        .participantId(p.getParticipantId())
                        .userId(p.getUser().getUserId())
                        .username(p.getUser().getUsername())
                        .avatarUrl(p.getUser().getAvatarUrl())
                        .status(p.getStatus().name())
                        .joinedAt(p.getJoinedAt())
                        .build())
                .collect(Collectors.toList());

        return MeetingDTO.builder()
                .meetingId(meeting.getMeetingId())
                .title(meeting.getTitle())
                .description(meeting.getDescription())
                .roomId(meeting.getChatRoom().getRoomId())
                .roomName(meeting.getChatRoom().getName())
                .createdById(meeting.getCreatedBy().getUserId())
                .createdByName(meeting.getCreatedBy().getUsername())
                .startTime(meeting.getStartTime())
                .endTime(meeting.getEndTime())
                .duration(meeting.getDuration())
                .type(meeting.getType().name())
                .status(meeting.getStatus().name())
                .meetingLink(meeting.getMeetingLink())
                .createdAt(meeting.getCreatedAt())
                .participants(participantDTOs)
                .build();
    }
}
