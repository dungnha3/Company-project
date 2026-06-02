package DoAn.BE.project.listener;

import DoAn.BE.notification.service.EmailNotificationService;
import DoAn.BE.project.entity.Issue;
import DoAn.BE.project.event.IssueEvent;
import DoAn.BE.project.event.IssueUpdatedEvent;
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

import java.util.HashSet;
import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class IssueNotificationListener {

    private final IssueRepository issueRepository;
    private final EmailNotificationService emailNotificationService;

    // =========================================================================
    //  HANDLER 1 — Issue được giao cho người mới (ASSIGNED)
    // =========================================================================

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

        Issue issue = issueRepository.findById(event.getIssue().getIssueId()).orElse(null);
        if (issue == null) {
            log.warn("ASSIGNED event for unknown issue id={}", event.getIssue().getIssueId());
            return;
        }

        // ── UX guard: chỉ gửi email khi issue nằm trong sprint đang ACTIVE ──────
        // Backlog (sprint == null) hoặc sprint PLANNING → không gửi để tránh spam.
        if (!shouldNotifyOnAssign(issue)) {
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
                    issue.getProject().getName(),
                    issue.getIssueKey()
            );
        } catch (Exception e) {
            log.error("Failed to send issue-assigned email for {} to {}: {}",
                    issue.getIssueKey(), email, e.getMessage());
        }
    }

    private boolean shouldNotifyOnAssign(Issue issue) {
        if (issue.getSprint() == null) {
            log.debug("Issue {} is in Backlog — skipping assignment email", issue.getIssueKey());
            return false;
        }
        if (issue.getSprint().getStatus() != DoAn.BE.project.entity.Sprint.SprintStatus.ACTIVE) {
            log.debug("Issue {} sprint '{}' is {} — skipping assignment email",
                    issue.getIssueKey(),
                    issue.getSprint().getName(),
                    issue.getSprint().getStatus());
            return false;
        }
        return true;
    }

    private boolean shouldNotifyOnUpdate(Issue issue) {
        if (issue.getSprint() == null) {
            log.debug("Issue {} is in Backlog — skipping update email", issue.getIssueKey());
            return false;
        }
        if (issue.getSprint().getStatus() != DoAn.BE.project.entity.Sprint.SprintStatus.ACTIVE) {
            log.debug("Issue {} sprint '{}' is {} — skipping update email",
                    issue.getIssueKey(),
                    issue.getSprint().getName(),
                    issue.getSprint().getStatus());
            return false;
        }
        return true;
    }

    // =========================================================================
    //  HANDLER 2 — Issue có cập nhật (đổi status, comment mới...)
    // =========================================================================

    /**
     * Gửi email thông báo đến Assignee và Reporter khi issue có thay đổi.
     *
     * <p><b>Constraint quan trọng:</b>
     * <ul>
     *   <li>Dùng {@code Set<User>} để tự động loại trùng nếu Assignee == Reporter.</li>
     *   <li>Loại bỏ Actor (người vừa thao tác) khỏi danh sách nhận — tránh self-spam.</li>
     *   <li>Kiểm tra null email trước khi gửi để tránh NullPointerException.</li>
     *   <li>Lỗi gửi mail 1 người không chặn việc gửi cho người còn lại.</li>
     * </ul>
     *
     * <p><b>Tại sao AFTER_COMMIT?</b>
     * Đảm bảo listener chỉ chạy sau khi dữ liệu thay đổi đã được commit vào DB.
     * Thread async sẽ re-fetch issue và nhìn thấy trạng thái mới nhất.
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public void handleIssueUpdated(IssueUpdatedEvent event) {

        // ── Bước 1: Re-fetch issue để có Hibernate session và lazy load an toàn ──
        Issue issue = issueRepository.findById(event.getIssue().getIssueId()).orElse(null);
        if (issue == null) {
            log.warn("[IssueUpdated] Issue id={} không tồn tại, bỏ qua gửi email",
                    event.getIssue().getIssueId());
            return;
        }

        // ── Bước 2: UX guard – chỉ gửi email khi issue thuộc sprint đang ACTIVE ──
        if (!shouldNotifyOnUpdate(issue)) {
            return;
        }

        // ── Bước 3: Xác định Actor để loại ra khỏi danh sách nhận ──────────────
        User actor = event.getActor();
        Long actorId = (actor != null) ? actor.getUserId() : null;
        String actorName = (actor != null && actor.getFullName() != null)
                ? actor.getFullName()
                : (actor != null ? actor.getUsername() : "Hệ thống");

        // ── Bước 4: Gộp các người liên quan vào Set để tự loại trùng ────────────
        // Set<User> tự loại trùng nếu Assignee == Reporter (cùng userId)
        Set<User> recipients = new HashSet<>();

        User assignee = issue.getAssignee();
        if (assignee != null) {
            recipients.add(assignee);
        }

        User reporter = issue.getReporter();
        if (reporter != null) {
            recipients.add(reporter);
        }

        // Mở rộng trong tương lai: thêm Watcher, Reviewer... vào đây

        if (recipients.isEmpty()) {
            log.debug("[IssueUpdated] Issue {} không có ai liên quan, bỏ qua gửi email",
                    issue.getIssueKey());
            return;
        }

        // ── Bước 5: Gửi email từng người, bỏ qua Actor ──────────────────────────
        String projectName = issue.getProject().getName(); // safe: session active
        String issueKey    = issue.getIssueKey();
        String issueTitle  = issue.getTitle();
        String changeType  = event.getChangeType();
        String changeDetail = event.getChangeDetail();

        for (User recipient : recipients) {

            // ✅ Constraint cốt lõi: KHÔNG gửi cho người vừa thực hiện hành động
            if (actorId != null && actorId.equals(recipient.getUserId())) {
                log.debug("[IssueUpdated] Bỏ qua Actor {} cho issue {}", actorId, issueKey);
                continue;
            }

            // ✅ Kiểm tra email hợp lệ
            String email = recipient.getEmail();
            if (email == null || email.isBlank()) {
                log.warn("[IssueUpdated] User '{}' không có email — bỏ qua thông báo cho {}",
                        recipient.getUsername(), issueKey);
                continue;
            }

            // ✅ Tên hiển thị trong lời chào
            String recipientName = (recipient.getFullName() != null && !recipient.getFullName().isBlank())
                    ? recipient.getFullName()
                    : recipient.getUsername();

            try {
                emailNotificationService.sendIssueUpdatedEmail(
                        email,
                        recipientName,
                        issueKey,
                        issueTitle,
                        projectName,
                        changeType,
                        changeDetail,
                        actorName
                );
            } catch (Exception e) {
                // Lỗi gửi cho 1 người không được chặn việc gửi cho người khác
                log.error("[IssueUpdated] Lỗi gửi email cho {} (issue {}): {}",
                        email, issueKey, e.getMessage());
            }
        }
    }
}
