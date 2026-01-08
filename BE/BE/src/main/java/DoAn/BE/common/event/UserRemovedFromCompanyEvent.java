package DoAn.BE.common.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class UserRemovedFromCompanyEvent extends ApplicationEvent {
    private final Long userId;
    private final Long companyId;

    public UserRemovedFromCompanyEvent(Object source, Long userId, Long companyId) {
        super(source);
        this.userId = userId;
        this.companyId = companyId;
    }
}
