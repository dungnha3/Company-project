package DoAn.BE.chat.dto;

import java.time.LocalDateTime;
import java.util.List;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MeetingDTO {

    private Long meetingId;
    private String title;
    private String description;
    private Long roomId;
    private String roomName;
    private Long createdById;
    private String createdByName;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Integer duration;
    private String type;
    private String status;
    private String meetingLink;
    private LocalDateTime createdAt;
    private List<ParticipantDTO> participants;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ParticipantDTO {
        private Long participantId;
        private Long userId;
        private String username;
        private String avatarUrl;
        private String status;
        private LocalDateTime joinedAt;
    }
}
