package DoAn.BE.calendar.dto;

import java.time.LocalDateTime;
import java.util.List;

import DoAn.BE.calendar.entity.CalendarEvent.EventType;
import jakarta.validation.constraints.*;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateEventRequest {

    @NotBlank(message = "Tiêu đề là bắt buộc")
    @Size(max = 255)
    private String title;

    private String description;

    @NotNull(message = "Thời gian bắt đầu là bắt buộc")
    private LocalDateTime startTime;

    @NotNull(message = "Thời gian kết thúc là bắt buộc")
    private LocalDateTime endTime;

    @Builder.Default
    private Boolean allDay = false;

    @Builder.Default
    private EventType eventType = EventType.MEETING;

    @Size(max = 255)
    private String location;

    @Size(max = 500)
    private String meetingLink;

    private String recurrenceRule;

    private Long projectId;
    private Long issueId;

    // List of user IDs to invite
    private List<Long> attendeeIds;
}
