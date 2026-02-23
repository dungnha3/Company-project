package DoAn.BE.common.event;

import DoAn.BE.user.entity.User;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

// Fixed: Added @Getter annotation instead of manual getters
@Getter
public class UserUpdatedEvent extends ApplicationEvent {
    private final User user;
    private final User actor;
    private final UpdateType type;

    public enum UpdateType {
        PROFILE_UPDATE,
        ROLE_UPDATE,
        STATUS_CHANGE_ACTIVATED,
        STATUS_CHANGE_DEACTIVATED,
        PASSWORD_CHANGE
    }

    public UserUpdatedEvent(Object source, User user, User actor, UpdateType type) {
        super(source);
        this.user = user;
        this.actor = actor;
        this.type = type;
    }
}
