package DoAn.BE.project.listener;

import DoAn.BE.notification.service.EmailNotificationService;
import DoAn.BE.project.entity.Issue;
import DoAn.BE.project.event.IssueEvent;
import DoAn.BE.project.repository.IssueRepository;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
@Slf4j
public class IssueNotificationListener {

    private final IssueRepository issueRepository;
    private final EmailNotificationService emailNotificationService;

    /**
     * Sends email to the new assignee after the transaction commits.
     *
     * WHY @TransactionalEventListener(AFTER_COMMIT)?
     * Plain @EventListener fires the task while the outer transaction is still open.
     * The async thread re-fetches from DB but gets the OLD assignee (PostgreSQL Read
     * Committed: uncommitted writes are invisible). AFTER_COMMIT guarantees this
     * listener only runs once the new assignee is durably written to DB.
     *
     * WHY @Transactional(readOnly = true)?
     * The async thread has no Hibernate session. @Transactional opens a fresh one so
     * lazy associations (project.getName(), etc.) can be loaded without LazyInitEx.
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public void handleIssueAssigned(IssueEvent event) {
        if (event.getEventType() != IssueEvent.EventType.ASSIGNED) {
            return;
        }

        // Re-fetch to guarantee a live Hibernate session for lazy associations
        Issue issue = issueRepository.findById(event.getIssue().getIssueId()).orElse(null);
        if (issue == null) {
            log.warn("ASSIGNED event for unknown issue id={}", event.getIssue().getIssueId());
            return;
        }

        User assignee = issue.getAssignee();
        if (assignee == null) {
            log.warn("ASSIGNED event fired for issue {} but assignee is null", issue.getIssueKey());
            return;
        }

        String email = assignee.getEmail();
        if (email == null || email.isBlank()) {
            log.warn("Assignee '{}' has no email — skipping notification for {}",
                    assignee.getUsername(), issue.getIssueKey());
            return;
        }

        try {
            emailNotificationService.sendIssueAssignedEmail(
                    email,
                    assignee.getUsername(),
                    issue.getTitle(),
                    issue.getProject().getName(),  // safe: fresh session is active
                    issue.getIssueKey()
            );
        } catch (Exception e) {
            // Email failure must NOT affect the main business flow
            log.error("Failed to send issue-assigned email for {} to {}: {}",
                    issue.getIssueKey(), email, e.getMessage());
        }
    }
}

