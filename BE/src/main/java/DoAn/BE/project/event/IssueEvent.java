package DoAn.BE.project.event;

import DoAn.BE.project.entity.Issue;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class IssueEvent extends ApplicationEvent {

    private final Issue issue;
    private final EventType eventType;

    private final Long actorId;

    public IssueEvent(Object source, Issue issue, EventType eventType, Long actorId) {
        super(source);
        this.issue = issue;
        this.eventType = eventType;
        this.actorId = actorId;
    }

    public Long getActorId() {
        return actorId;
    }

    public enum EventType {
        CREATED,
        UPDATED,
        DELETED,
        ASSIGNED,
        STATUS_CHANGED,
        COMMENT_ADDED,
        COMMENT_EDITED,
        COMMENT_DELETED,
        OVERDUE,
        DEADLINE_APPROACHING
    }
}
