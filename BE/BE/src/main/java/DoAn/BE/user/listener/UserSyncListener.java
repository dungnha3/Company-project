package DoAn.BE.user.listener;

import DoAn.BE.common.context.TenantContext;
import DoAn.BE.common.event.UserUpdatedEvent;
import DoAn.BE.common.service.FirebaseAuthSyncService;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class UserSyncListener {

    private final FirebaseAuthSyncService firebaseAuthSyncService;

    @Async
    @EventListener
    public void handleUserUpdated(UserUpdatedEvent event) {
        User user = event.getUser();
        // Sync to firebase on any user update (profile, role, or status)
        // Note: Async listeners might lose ThreadLocal context if not handled
        // carefully.
        // For TenantContext, we might need to pass the companyId in the event if it's
        // tenant-specific.
        // However, User entity is global but Firebase sync might depend on context.
        // Assuming global sync or current thread context propagation is handled by
        // TaskDecorator.

        Long companyId = TenantContext.getCompanyId();
        // If Async without TaskDecorator, this will be null.
        // We should double check AsyncSchedulingConfig for TenantAwareTaskDecorator.

        firebaseAuthSyncService.syncUserToFirebase(user, companyId);
        log.info("🔄 Synced user {} to Firebase", user.getUsername());
    }
}
