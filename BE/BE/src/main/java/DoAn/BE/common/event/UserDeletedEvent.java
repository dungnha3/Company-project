package DoAn.BE.common.event;

import DoAn.BE.user.entity.User;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

// Fixed: Added @Getter annotation instead of manual getters
@Getter
public class UserDeletedEvent extends ApplicationEvent {
    private final User user;
    private final User actor;

    public UserDeletedEvent(Object source, User user, User actor) {
        super(source);
        this.user = user;
        this.actor = actor;
    }
}
