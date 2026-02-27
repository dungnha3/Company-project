package DoAn.BE.project.service;

import DoAn.BE.project.entity.Issue;
import DoAn.BE.project.repository.IssueRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
@Service
@RequiredArgsConstructor
@Slf4j
public class IssueScheduledService {

    private final IssueRepository issueRepository;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;
    @Scheduled(cron = "0 0 9 * * *")
    @Transactional
    public void checkOverdueIssues() {
        log.info("🔍 Bắt đầu kiểm tra overdue issues...");

        int page = 0;
        int size = 100;
        int overdueCount = 0;
        org.springframework.data.domain.Page<Issue> issuePage;

        do {
            issuePage = issueRepository.findOverdueIssues(LocalDate.now(),
                    org.springframework.data.domain.PageRequest.of(page, size));

            for (Issue issue : issuePage.getContent()) {
                try {
                    // Publish Event for Overdue
                    eventPublisher.publishEvent(new DoAn.BE.project.event.IssueEvent(
                            this, issue, DoAn.BE.project.event.IssueEvent.EventType.OVERDUE, null));

                    overdueCount++;
                    log.debug("⚠️ Sent overdue notification for issue: {}", issue.getIssueKey());
                } catch (Exception e) {
                    log.error("Error sending overdue notification for issue {}: {}",
                            issue.getIssueKey(), e.getMessage());
                }
            }
            page++;
        } while (issuePage.hasNext());

        log.info("✅ Hoàn tất kiểm tra overdue issues. Đã gửi {} notifications", overdueCount);
    }
    @Scheduled(cron = "0 0 10 * * *")
    @Transactional
    public void remindUpcomingDeadlines() {
        log.info("🔔 Bắt đầu nhắc deadline sắp tới...");

        LocalDate threeDaysLater = LocalDate.now().plusDays(3);
        int page = 0;
        int size = 100;
        int reminderCount = 0;
        org.springframework.data.domain.Page<Issue> issuePage;

        do {
            issuePage = issueRepository.findUpcomingDeadlines(threeDaysLater,
                    org.springframework.data.domain.PageRequest.of(page, size));

            for (Issue issue : issuePage.getContent()) {
                try {
                    // Publish Event for Deadline Approaching
                    eventPublisher.publishEvent(new DoAn.BE.project.event.IssueEvent(
                            this, issue, DoAn.BE.project.event.IssueEvent.EventType.DEADLINE_APPROACHING, null));

                    reminderCount++;
                    log.debug("🔔 Sent deadline reminder for issue: {}", issue.getIssueKey());
                } catch (Exception e) {
                    log.error("Error sending deadline reminder for issue {}: {}",
                            issue.getIssueKey(), e.getMessage());
                }
            }
            page++;
        } while (issuePage.hasNext());

        log.info("✅ Hoàn tất nhắc deadline. Đã gửi {} reminders", reminderCount);
    }
}
