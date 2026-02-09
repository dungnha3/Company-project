package DoAn.BE.project.event;

import DoAn.BE.project.dto.ProjectDTO;
import org.springframework.context.ApplicationEvent;

public class ProjectEvent extends ApplicationEvent {

    public enum Type {
        CREATED,
        UPDATED,
        DELETED,
        COMPLETED,
        ARCHIVED,
        STATUS_CHANGED,
        MEMBER_ADDED,
        MEMBER_REMOVED,
        ROLE_CHANGED
    }

    private final Type type;
    private final ProjectDTO project;
    private final Long actorId; // UserId of the person performing action
    private final Object payload; // Optional extra data (e.g. member info)

    public ProjectEvent(Object source, Type type, ProjectDTO project, Long actorId, Object payload) {
        super(source);
        this.type = type;
        this.project = project;
        this.actorId = actorId;
        this.payload = payload;
    }

    public ProjectEvent(Object source, Type type, ProjectDTO project, Long actorId) {
        this(source, type, project, actorId, null);
    }

    public Type getType() {
        return type;
    }

    public ProjectDTO getProject() {
        return project;
    }

    public Long getActorId() {
        return actorId;
    }

    public Object getPayload() {
        return payload;
    }
}
