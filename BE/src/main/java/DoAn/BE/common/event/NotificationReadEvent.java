package DoAn.BE.common.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class NotificationReadEvent extends ApplicationEvent {
    private final Long userId;
    private final Long notificationId;

    public NotificationReadEvent(Object source, Long userId, Long notificationId) {
        super(source);
        this.userId = userId;
        this.notificationId = notificationId;
    }
}
