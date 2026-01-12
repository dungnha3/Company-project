package DoAn.BE.project.service;

import DoAn.BE.project.entity.Sprint;
import DoAn.BE.project.repository.SprintRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

// [Service xử lý scheduled jobs cho Sprint] (Role: System/Scheduler)
@Service
@RequiredArgsConstructor
@Slf4j
public class SprintScheduledService {

    private final SprintRepository sprintRepository;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;

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

            // Publish Event for Sprint Ending Soon
            // We pass null for actorId since it's a system event
            eventPublisher.publishEvent(new DoAn.BE.project.event.SprintEvent(
                    this,
                    DoAn.BE.project.event.SprintEvent.Type.ENDING_SOON,
                    convertToDTO(sprint),
                    null));

            log.debug("⏰ Published ENDING_SOON event for sprint {}", sprint.getName());
            return 1; // Count as 1 sprint processed

        } catch (Exception e) {
            log.error("Lỗi kiểm tra sprint {}: {}", sprint.getName(), e.getMessage());
            return 0;
        }
    }

    private DoAn.BE.project.dto.SprintDTO convertToDTO(Sprint sprint) {
        DoAn.BE.project.dto.SprintDTO dto = new DoAn.BE.project.dto.SprintDTO();
        dto.setSprintId(sprint.getSprintId());
        dto.setName(sprint.getName());
        dto.setProjectId(sprint.getProject().getProjectId());
        dto.setStartDate(sprint.getStartDate());
        dto.setEndDate(sprint.getEndDate());
        // Populate other fields if necessary for notification text
        return dto;
    }
}
