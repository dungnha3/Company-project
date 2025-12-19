package DoAn.BE.chat.dto;

import java.time.LocalDateTime;
import java.util.List;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateMeetingRequest {

    private Long roomId;
    private String title;
    private String description;
    private LocalDateTime startTime;
    private Integer duration; // in minutes
    private String type; // INSTANT or SCHEDULED
    private List<Long> participantIds;
}
