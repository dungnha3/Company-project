package DoAn.BE.calendar.dto;

import DoAn.BE.calendar.entity.EventAttendee.ResponseStatus;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendeeDTO {
    private Long userId;
    private String userName;
    private String userAvatar;
    private ResponseStatus responseStatus;
}
