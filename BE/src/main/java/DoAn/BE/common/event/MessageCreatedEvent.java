package DoAn.BE.common.event;

import DoAn.BE.chat.entity.Message;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class MessageCreatedEvent extends ApplicationEvent {
    private final Message message;

    public MessageCreatedEvent(Object source, Message message) {
        super(source);
        this.message = message;
    }
}
