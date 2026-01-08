package DoAn.BE.project.service;

import DoAn.BE.project.entity.ProjectMember;
import DoAn.BE.project.entity.Sprint;
import DoAn.BE.project.repository.ProjectMemberRepository;
import DoAn.BE.project.repository.SprintRepository;
import DoAn.BE.notification.service.ProjectNotificationService;
import DoAn.BE.notification.service.FCMService;
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

// [Service xử lý scheduled jobs cho Sprint] (Role: System/Scheduler)
@Service
@RequiredArgsConstructor
@Slf4j
public class SprintScheduledService {

    private final SprintRepository sprintRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectNotificationService projectNotificationService;
    private final FCMService fcmService;

    // [Định dạng ngày tháng] (Role: Config)
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    // [Số ngày trước khi kết thúc để cảnh báo] (Role: Config)
    private static final int DAYS_BEFORE_ENDING_WARNING = 3;

    // [Kiểm tra sprints sắp kết thúc - chạy mỗi ngày lúc 8:00 AM] (Role: Scheduler)
    @Scheduled(cron = "0 0 8 * * *")
    @Transactional
    public void checkSprintsEndingSoon() {
        log.info("🔍 Bắt đầu kiểm tra sprints sắp kết thúc...");

        LocalDate warningDate = LocalDate.now().plusDays(DAYS_BEFORE_ENDING_WARNING);

        // [Lấy tất cả sprints đang active] (Role: Query)
        List<Sprint> activeSprints = sprintRepository.findByStatus(Sprint.SprintStatus.ACTIVE);

        int notifiedCount = 0;
        for (Sprint sprint : activeSprints) {
            notifiedCount += processSprintEndingWarning(sprint, warningDate);
        }

        log.info("✅ Hoàn tất kiểm tra sprints. Đã gửi {} notifications", notifiedCount);
    }

    // [Xử lý cảnh báo sprint sắp kết thúc] (Role: Internal)
    private int processSprintEndingWarning(Sprint sprint, LocalDate warningDate) {
        try {
            // [Kiểm tra sprint có kết thúc vào ngày cảnh báo không] (Role: Business Rule)
            if (sprint.getEndDate() == null || !sprint.getEndDate().equals(warningDate)) {
                return 0;
            }

            if (sprint.getProject() == null) {
                return 0;
            }

            String endDateStr = sprint.getEndDate().format(DATE_FORMATTER);

            // [Lấy danh sách thành viên project] (Role: Query)
            List<ProjectMember> members = projectMemberRepository.findByProject_ProjectId(
                    sprint.getProject().getProjectId());

            // [Gửi thông báo cho từng thành viên] (Role: Notification)
            for (ProjectMember member : members) {
                notifyMemberAboutSprintEnding(member, sprint, endDateStr);
            }

            log.debug("⏰ Sprint {} kết thúc vào {}, đã thông báo {} thành viên",
                    sprint.getName(), endDateStr, members.size());
            return members.size();

        } catch (Exception e) {
            log.error("Lỗi kiểm tra sprint {}: {}", sprint.getName(), e.getMessage());
            return 0;
        }
    }

    // [Thông báo thành viên về sprint sắp kết thúc] (Role: Notification)
    private void notifyMemberAboutSprintEnding(ProjectMember member, Sprint sprint, String endDateStr) {
        if (member.getUser() == null) {
            return;
        }

        // [Tạo thông báo trong hệ thống] (Role: Notification)
        projectNotificationService.createSprintEndingNotification(
                member.getUser().getUserId(),
                sprint.getName(),
                endDateStr,
                sprint.getProject().getProjectId());

        // [Gửi push notification qua FCM] (Role: Push Notification)
        sendFCMNotification(member, sprint, endDateStr);
    }

    // [Gửi FCM push notification] (Role: Push Notification)
    private void sendFCMNotification(ProjectMember member, Sprint sprint, String endDateStr) {
        if (member.getUser().getFcmToken() == null) {
            return;
        }

        Map<String, String> data = new HashMap<>();
        data.put("type", "SPRINT_ENDING_SOON");
        data.put("sprintId", sprint.getSprintId().toString());
        data.put("projectId", sprint.getProject().getProjectId().toString());
        data.put("link", "/projects/" + sprint.getProject().getProjectId() + "/sprints/" + sprint.getSprintId());

        fcmService.sendToDevice(
                member.getUser().getFcmToken(),
                "⏰ Sprint sắp kết thúc",
                "Sprint \"" + sprint.getName() + "\" kết thúc vào " + endDateStr,
                data);
    }
}
