package DoAn.BE.calendar.dto;

import java.time.LocalDateTime;
import java.util.List;

import DoAn.BE.calendar.entity.CalendarEvent.EventType;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CalendarEventDTO {
    private Long eventId;
    private String title;
    private String description;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Boolean allDay;
    private EventType eventType;
    private String location;
    private String meetingLink;
    private String recurrenceRule;

    // Creator info
    private Long createdById;
    private String createdByName;

    // Related entities
    private Long projectId;
    private String projectName;
    private Long issueId;
    private String issueKey;

    // Attendees
    private List<AttendeeDTO> attendees;

    private LocalDateTime createdAt;
}
