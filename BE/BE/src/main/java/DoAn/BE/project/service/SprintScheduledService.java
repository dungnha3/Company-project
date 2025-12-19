package DoAn.BE.project.service;

import DoAn.BE.project.entity.ProjectMember;
import DoAn.BE.project.entity.Sprint;
import DoAn.BE.project.repository.ProjectMemberRepository;
import DoAn.BE.project.repository.SprintRepository;
import DoAn.BE.notification.service.ProjectNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

/**
 * Service xử lý scheduled jobs cho Sprint
 * - Check sprints ending soon
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SprintScheduledService {

    private final SprintRepository sprintRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectNotificationService projectNotificationService;
    private final DoAn.BE.notification.service.FCMService fcmService;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /**
     * Check sprints ending in 3 days (chạy mỗi ngày lúc 8:00 AM)
     */
    @Scheduled(cron = "0 0 8 * * *")
    @Transactional
    public void checkSprintsEndingSoon() {
        log.info("🔍 Bắt đầu kiểm tra sprints sắp kết thúc...");

        LocalDate threeDaysLater = LocalDate.now().plusDays(3);

        // Get all active sprints
        List<Sprint> activeSprints = sprintRepository.findByStatus(Sprint.SprintStatus.ACTIVE);

        int notifiedCount = 0;
        for (Sprint sprint : activeSprints) {
            try {
                // Check if sprint ends in 3 days
                if (sprint.getEndDate() != null && sprint.getEndDate().equals(threeDaysLater)) {
                    String endDateStr = sprint.getEndDate().format(DATE_FORMATTER);

                    // Notify all project members
                    if (sprint.getProject() != null) {
                        List<ProjectMember> members = projectMemberRepository.findByProject_ProjectId(
                                sprint.getProject().getProjectId());

                        for (ProjectMember member : members) {
                            if (member.getUser() != null) {
                                projectNotificationService.createSprintEndingNotification(
                                        member.getUser().getUserId(),
                                        sprint.getName(),
                                        endDateStr,
                                        sprint.getProject().getProjectId());

                                // 📱 Push FCM notification
                                if (member.getUser().getFcmToken() != null) {
                                    Map<String, String> data = new HashMap<>();
                                    data.put("type", "SPRINT_ENDING_SOON");
                                    data.put("sprintId", sprint.getSprintId().toString());
                                    data.put("projectId", sprint.getProject().getProjectId().toString());
                                    data.put("link", "/projects/" + sprint.getProject().getProjectId() + "/sprints/"
                                            + sprint.getSprintId());
                                    fcmService.sendToDevice(
                                            member.getUser().getFcmToken(),
                                            "⏰ Sprint sắp kết thúc",
                                            "Sprint \"" + sprint.getName() + "\" kết thúc vào " + endDateStr,
                                            data);
                                }
                            }
                        }

                        notifiedCount += members.size();
                        log.debug("⏰ Sprint {} ending on {}, notified {} members",
                                sprint.getName(), endDateStr, members.size());
                    }
                }
            } catch (Exception e) {
                log.error("Error checking sprint {}: {}", sprint.getName(), e.getMessage());
            }
        }

        log.info("✅ Hoàn tất kiểm tra sprints. Đã gửi {} notifications", notifiedCount);
    }
}
