package DoAn.BE.user.listener;

import DoAn.BE.common.event.UserCreatedEvent;
import DoAn.BE.common.event.UserUpdatedEvent;
import DoAn.BE.notification.service.AuthNotificationService;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class UserNotificationListener {

    private final AuthNotificationService authNotificationService;

    @Async
    @EventListener
    public void handleUserCreated(UserCreatedEvent event) {
        User user = event.getUser();
        authNotificationService.createWelcomeNotification(user.getUserId(), user.getUsername());
        log.info("🔔 Sent welcome notification to {}", user.getUsername());
    }

    @Async
    @EventListener
    public void handleUserUpdated(UserUpdatedEvent event) {
        User user = event.getUser();

        switch (event.getType()) {
            case STATUS_CHANGE_ACTIVATED:
                authNotificationService.createAccountActivatedNotification(user.getUserId());
                break;
            case STATUS_CHANGE_DEACTIVATED:
                authNotificationService.createAccountDeactivatedNotification(user.getUserId(), null);
                break;
            case PASSWORD_CHANGE:
                authNotificationService.createPasswordChangedNotification(user.getUserId());
                break;
            default:
                break;
        }
    }
    // specific events for them
}
