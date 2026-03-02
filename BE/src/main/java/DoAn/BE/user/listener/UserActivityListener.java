package DoAn.BE.user.listener;

import DoAn.BE.audit.entity.AuditLog;
import DoAn.BE.audit.service.AuditLogService;
import DoAn.BE.common.event.UserCreatedEvent;
import DoAn.BE.common.event.UserDeletedEvent;
import DoAn.BE.common.event.UserUpdatedEvent;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class UserActivityListener {

    private final AuditLogService auditLogService;

    @Async
    @EventListener
    public void handleUserCreated(UserCreatedEvent event) {
        User user = event.getUser();
        auditLogService.logAction(
                user.getUserId(),
                "CREATE_USER",
                "USER",
                user.getUserId(),
                null,
                user,
                AuditLog.Severity.INFO,
                null,
                null);
        log.info("Audit Log: Created user {}", user.getUsername());
    }

    @Async
    @EventListener
    public void handleUserUpdated(UserUpdatedEvent event) {
        User user = event.getUser();
        User actor = event.getActor();
        auditLogService.logAction(
                actor.getUserId(),
                "UPDATE_USER",
                "USER",
                user.getUserId(),
                null,
                user,
                AuditLog.Severity.INFO,
                "User updated profile",
                null);
    }

    @Async
    @EventListener
    public void handleUserDeleted(UserDeletedEvent event) {
        User user = event.getUser();
        User actor = event.getActor();
        auditLogService.logAction(
                actor.getUserId(),
                "DELETE_USER",
                "USER",
                user.getUserId(),
                user,
                null,
                AuditLog.Severity.CRITICAL,
                "Soft deleted user " + user.getUsername(),
                null);
        log.info("Audit Log: Deleted user {}", user.getUsername());
    }
}
