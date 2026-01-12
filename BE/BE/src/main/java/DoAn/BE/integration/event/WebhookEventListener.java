package DoAn.BE.integration.event;

import DoAn.BE.integration.entity.Integration;
import DoAn.BE.integration.service.IntegrationService;
import DoAn.BE.project.entity.Issue;
import DoAn.BE.project.event.IssueEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebhookEventListener {

    private final IntegrationService integrationService;

    @Async("notificationExecutor")
    @EventListener
    public void handleIssueEvent(IssueEvent event) {
        Issue issue = event.getIssue();
        log.info("Processing Webhook event for issue: {}", issue.getIssueKey());

        String title = "Issue " + event.getEventType();
        String message = String.format("Issue [%s] %s: %s\nAssignee: %s\nPriority: %s",
                issue.getIssueKey(),
                issue.getTitle(),
                event.getEventType(),
                issue.getAssignee() != null ? issue.getAssignee().getUsername() : "Unassigned",
                issue.getPriority());

        Map<String, Object> data = new HashMap<>();
        data.put("issueId", issue.getIssueId());
        data.put("issueKey", issue.getIssueKey());
        data.put("eventType", event.getEventType());

        // Notify Slack
        integrationService.notifyIntegrations(Integration.IntegrationType.SLACK, title, message, data);

        // Notify Discord
        integrationService.notifyIntegrations(Integration.IntegrationType.DISCORD, title, message, data);

        // Notify Custom Webhooks
        integrationService.notifyIntegrations(Integration.IntegrationType.GENERIC_WEBHOOK, title, message, data);
    }
}
