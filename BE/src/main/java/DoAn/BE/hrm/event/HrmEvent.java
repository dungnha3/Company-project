package DoAn.BE.hrm.event;

import org.springframework.context.ApplicationEvent;

public class HrmEvent extends ApplicationEvent {

    public enum Type {
        EMPLOYEE_HIRED,
        EMPLOYEE_RESIGNED,
        LEAVE_REQUESTED,
        LEAVE_APPROVED,
        LEAVE_REJECTED,
        REVIEW_CREATED,
        REVIEW_APPROVED
    }

    private final Type type;
    private final Object entity; // Can be Employee, LeaveRequest, Contract, etc.
    private final Long actorId;
    private final String description; // Short description for logging/display

    public HrmEvent(Object source, Type type, Object entity, Long actorId, String description) {
        super(source);
        this.type = type;
        this.entity = entity;
        this.actorId = actorId;
        this.description = description;
    }

    public Type getType() {
        return type;
    }

    public Object getEntity() {
        return entity;
    }

    public Long getActorId() {
        return actorId;
    }

    public String getDescription() {
        return description;
    }
}
