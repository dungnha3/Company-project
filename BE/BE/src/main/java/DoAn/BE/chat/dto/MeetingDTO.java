package DoAn.BE.chat.dto;

import DoAn.BE.chat.entity.Meeting;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

public class MeetingDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateMeetingRequest {
        private Long chatRoomId;
        private String title;
        private Meeting.MeetingType type; // INSTANT default
        private LocalDateTime startTime; // For SCHEDULED
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MeetingResponse {
        private Long meetingId;
        private String title;
        private String description;
        private Long chatRoomId;
        private String meetingLink;
        private Meeting.MeetingType type;
        private Meeting.MeetingStatus status;
        private LocalDateTime startTime;
        private LocalDateTime endTime;
        private Integer duration;
        private Long createdByUserId;
        private String createdByUsername;
        private LocalDateTime createdAt;
    }
}
