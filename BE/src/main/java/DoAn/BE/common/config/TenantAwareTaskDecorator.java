package DoAn.BE.common.config;

import DoAn.BE.common.context.TenantContext;
import org.springframework.core.task.TaskDecorator;
import org.springframework.lang.NonNull;

public class TenantAwareTaskDecorator implements TaskDecorator {

    @Override
    @NonNull
    public Runnable decorate(@NonNull Runnable runnable) {
        // Capture context from the current thread
        Long companyId = TenantContext.getCompanyId();

        return () -> {
            try {
                // Restore context in the async thread
                if (companyId != null) {
                    TenantContext.setCompanyId(companyId);
                }
                runnable.run();
            } finally {
                // Clear context to prevent leakage
                TenantContext.clear();
            }
        };
    }
}
