package DoAn.BE.project.event;

import DoAn.BE.project.dto.SprintDTO;
import org.springframework.context.ApplicationEvent;

public class SprintEvent extends ApplicationEvent {

    public enum Type {
        CREATED,
        STARTED,
        COMPLETED,
        ENDING_SOON,
        UPDATED,
        DELETED
    }

    private final Type type;
    private final SprintDTO sprint;
    private final Long actorId;

    public SprintEvent(Object source, Type type, SprintDTO sprint, Long actorId) {
        super(source);
        this.type = type;
        this.sprint = sprint;
        this.actorId = actorId;
    }

    public Type getType() {
        return type;
    }

    public SprintDTO getSprint() {
        return sprint;
    }

    public Long getActorId() {
        return actorId;
    }
}
