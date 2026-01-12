package DoAn.BE.calendar.event;

import DoAn.BE.calendar.dto.CalendarEventDTO;
import org.springframework.context.ApplicationEvent;

public class CalendarAppEvent extends ApplicationEvent {

    public enum Type {
        EVENT_CREATED,
        EVENT_UPDATED,
        EVENT_CANCELLED,
        ATTENDEE_RESPONDED
    }

    private final Type type;
    private final CalendarEventDTO calendarEvent;
    private final Long actorId;

    public CalendarAppEvent(Object source, Type type, CalendarEventDTO calendarEvent, Long actorId) {
        super(source);
        this.type = type;
        this.calendarEvent = calendarEvent;
        this.actorId = actorId;
    }

    public Type getType() {
        return type;
    }

    public CalendarEventDTO getCalendarEvent() {
        return calendarEvent;
    }

    public Long getActorId() {
        return actorId;
    }
}
