package DoAn.BE.project.listener;

import DoAn.BE.notification.service.EmailNotificationService;
import DoAn.BE.project.event.SprintStartedEvent;
import DoAn.BE.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.Map;

/**
 * Lắng nghe {@link SprintStartedEvent} để gửi email thông báo hàng loạt khi sprint bắt đầu.
 *
 * <p>Sau khi sprint chuyển sang ACTIVE, tất cả các issues trong sprint đã có assignee
 * sẽ được gom nhóm theo từng user — mỗi user nhận đúng 1 email tổng hợp chứa danh sách
 * các công việc được giao trong sprint đó.
 *
 * <p>Điều này tránh spam nhiều email lẻ khi sprint bắt đầu với nhiều issues.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SprintStartedNotificationListener {

    private final UserRepository userRepository;
    private final EmailNotificationService emailNotificationService;

    /**
     * Xử lý event sau khi transaction chứa thao tác bắt đầu sprint đã commit thành công.
     *
     * <p><b>Tại sao AFTER_COMMIT?</b>
     * Đảm bảo rằng các issues đã được lưu với sprintId mới trước khi listener
     * đọc dữ liệu. Nếu dùng BEFORE_COMMIT, transaction có thể bị rollback sau khi
     * email đã được gửi.
     *
     * <p><b>Tại sao REQUIRES_NEW cho mỗi email?</b>
     * Nếu 1 email thất bại, không ảnh hưởng đến các email còn lại.
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public void handleSprintStarted(SprintStartedEvent event) {
        Map<Long, java.util.List<String>> assigneeIssueKeys = event.getAssigneeIssueKeys();

        if (assigneeIssueKeys == null || assigneeIssueKeys.isEmpty()) {
            log.info("Sprint '{}' không có issue nào được gán — bỏ qua gửi email",
                    event.getSprint().getName());
            return;
        }

        String sprintName = event.getSprint().getName();
        String projectName = event.getSprint().getProject().getName();
        int totalEmails = 0;

        for (Map.Entry<Long, java.util.List<String>> entry : assigneeIssueKeys.entrySet()) {
            Long assigneeId = entry.getKey();
            java.util.List<String> issueKeys = entry.getValue();

            if (issueKeys == null || issueKeys.isEmpty()) {
                continue;
            }

            final Long userId = assigneeId;
            userRepository.findById(userId).ifPresent(user -> {
                // Actor đã bắt đầu sprint — không gửi email cho chính mình
                if (userId.equals(event.getActorId())) {
                    log.debug("Bỏ qua gửi email sprint bắt đầu cho actor {}", user.getUsername());
                    return;
                }

                String email = user.getEmail();
                if (email == null || email.isBlank()) {
                    log.warn("User '{}' không có email — bỏ qua thông báo sprint '{}'",
                            user.getUsername(), sprintName);
                    return;
                }

                try {
                    emailNotificationService.sendSprintStartedBatchEmail(
                            user,
                            sprintName,
                            projectName,
                            issueKeys
                    );
                } catch (Exception e) {
                    log.error("Lỗi gửi email sprint bắt đầu cho user {} (sprint '{}'): {}",
                            user.getUsername(), sprintName, e.getMessage());
                }
            });

            totalEmails++;
        }

        log.info("Đã xử lý gửi email sprint '{}' ({} recipients) cho {} issues",
                sprintName, totalEmails,
                assigneeIssueKeys.values().stream().mapToInt(java.util.List::size).sum());
    }
}
