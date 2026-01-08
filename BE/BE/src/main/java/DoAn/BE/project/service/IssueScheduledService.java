package DoAn.BE.project.service;

import DoAn.BE.project.entity.Issue;
import DoAn.BE.project.repository.IssueRepository;
import DoAn.BE.notification.service.ProjectNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import java.util.Map;
import java.util.HashMap;

// [Service scheduled jobs cho Issue - check overdue, send reminders] (Role: System)
@Service
@RequiredArgsConstructor
@Slf4j
public class IssueScheduledService {

    private final IssueRepository issueRepository;
    private final ProjectNotificationService projectNotificationService;
    private final DoAn.BE.notification.service.FCMService fcmService;

    // [Check overdue issues - 9:00 AM hàng ngày] (Role: Scheduled)
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
                    // Send notification
                    projectNotificationService.createIssueOverdueNotification(
                            issue.getAssignee().getUserId(),
                            issue.getTitle(),
                            issue.getIssueKey());

                    // 📱 Push FCM notification
                    if (issue.getAssignee().getFcmToken() != null) {
                        Map<String, String> data = new HashMap<>();
                        data.put("type", "ISSUE_OVERDUE");
                        data.put("issueId", issue.getIssueId().toString());
                        data.put("link",
                                "/projects/" + issue.getProject().getProjectId() + "/issues/" + issue.getIssueId());
                        fcmService.sendToDevice(
                                issue.getAssignee().getFcmToken(),
                                "⚠️ Issue Overdue",
                                "Issue \"" + issue.getTitle() + "\" (đã quá hạn",
                                data);
                    }

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

    // [Reminder deadline sắp tới (3 ngày) - 10:00 AM hàng ngày] (Role: Scheduled)
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
                    projectNotificationService.createIssueUpdatedNotification(
                            issue.getAssignee().getUserId(),
                            issue.getTitle(),
                            "System",
                            "Deadline sắp tới: " + issue.getDueDate());

                    // 📱 Push FCM notification
                    if (issue.getAssignee().getFcmToken() != null) {
                        Map<String, String> data = new HashMap<>();
                        data.put("type", "ISSUE_DEADLINE_REMINDER");
                        data.put("issueId", issue.getIssueId().toString());
                        data.put("link",
                                "/projects/" + issue.getProject().getProjectId() + "/issues/" + issue.getIssueId());
                        fcmService.sendToDevice(
                                issue.getAssignee().getFcmToken(),
                                "📅 Deadline sắp tới",
                                "Issue \"" + issue.getTitle() + "\" hết hạn trong 3 ngày nữa",
                                data);
                    }

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
