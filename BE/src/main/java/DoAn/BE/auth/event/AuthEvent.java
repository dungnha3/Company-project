package DoAn.BE.auth.event;

import org.springframework.context.ApplicationEvent;

public class AuthEvent extends ApplicationEvent {

    public enum Type {
        LOGIN_NEW_DEVICE,
        PASSWORD_CHANGED,
        ACCOUNT_LOCKED,
        PASSWORD_RESET_REQUESTED,
        SECURITY_ALERT
    }

    private final Type type;
    private final String username;
    private final Long userId;
    private final String description;
    private final Object payload;

    public AuthEvent(Object source, Type type, Long userId, String username, String description, Object payload) {
        super(source);
        this.type = type;
        this.userId = userId;
        this.username = username;
        this.description = description;
        this.payload = payload;
    }

    public Type getType() {
        return type;
    }

    public String getUsername() {
        return username;
    }

    public Long getUserId() {
        return userId;
    }

    public String getDescription() {
        return description;
    }

    public Object getPayload() {
        return payload;
    }
}
