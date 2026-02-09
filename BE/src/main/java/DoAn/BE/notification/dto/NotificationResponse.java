package DoAn.BE.notification.dto;

import java.time.LocalDateTime;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {
    private Long notificationId;
    private String type;
    private String title;
    private String content;
    private String link;
    private Boolean isRead;
    private LocalDateTime createdAt;
    private Long userId; // Minimal user info if needed

}
