package DoAn.BE.smart.service;

import DoAn.BE.project.entity.Sprint;
import DoAn.BE.project.entity.Issue;
import DoAn.BE.project.repository.SprintRepository;
import DoAn.BE.project.repository.IssueRepository;
import DoAn.BE.smart.dto.SprintHealthDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SprintHealthService {

    private final SprintRepository sprintRepository;
    private final IssueRepository issueRepository;

    public SprintHealthDTO getHealth(Long sprintId) {
        if (sprintId == null) return null;

        Sprint sprint = sprintRepository.findById(sprintId).orElse(null);
        if (sprint == null) return null;

        List<Issue> issues = issueRepository.findBySprint_SprintId(sprintId);
        if (issues.isEmpty()) {
            return buildEmptyHealth(sprint);
        }

        // 1. Completion Rate (30%)
        long total = issues.size();
        long completed = issues.stream()
                .filter(i -> i.getIssueStatus() != null && "Done".equals(i.getIssueStatus().getName()))
                .count();
        int completionRate = total > 0 ? (int) (completed * 100 / total) : 0;

        // 2. On-Time Rate (25%)
        long onTime = issues.stream()
                .filter(i -> i.getIssueStatus() != null && "Done".equals(i.getIssueStatus().getName()))
                .filter(i -> i.getCompletedAt() != null && i.getDueDate() != null)
                .filter(i -> !i.getCompletedAt().toLocalDate().isAfter(i.getDueDate()))
                .count();
        int onTimeRate = completed > 0 ? (int) (onTime * 100 / completed) : 0;

        // 3. Rework Rate (20%) - rework_score = (1 - rework_avg) * 100
        double avgRework = issues.stream()
                .mapToInt(i -> i.getReworkCount() != null ? i.getReworkCount() : 0)
                .average().orElse(0);
        int reworkScore = Math.max(0, (int) ((1 - avgRework / 3.0) * 100)); // normalize rework 0-3

        // 4. Velocity Accuracy (15%)
        BigDecimal actualHours = issues.stream()
                .map(i -> i.getActualHours() != null ? i.getActualHours() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal estimatedHours = issues.stream()
                .map(i -> i.getEstimatedHours() != null ? i.getEstimatedHours() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        int velocityAccuracy = 50;
        if (estimatedHours.compareTo(BigDecimal.ZERO) > 0) {
            double ratio = actualHours.divide(estimatedHours, 2, RoundingMode.HALF_UP).doubleValue();
            velocityAccuracy = (int) Math.min(ratio / 1.5 * 100, 100);
        }

        // 5. Burnout Risk (10%)
        Map<Long, Long> assigneeTaskCount = new HashMap<>();
        for (Issue i : issues) {
            if ((i.getIssueStatus() == null || !"Done".equals(i.getIssueStatus().getName())) && i.getAssignee() != null) {
                assigneeTaskCount.merge(i.getAssignee().getUserId(), 1L, (a, b) -> a + b);
            }
        }
        double avgWorkload = assigneeTaskCount.isEmpty() ? 0 :
                assigneeTaskCount.values().stream().mapToLong(Long::longValue).average().orElse(0);
        int burnoutRisk = avgWorkload > 5 ? (int) ((avgWorkload - 5) * 10) : 0;
        int burnoutScore = Math.max(0, 100 - burnoutRisk);

        // Total health score
        int healthScore = (int) (
                completionRate * 0.30 +
                onTimeRate * 0.25 +
                reworkScore * 0.20 +
                velocityAccuracy * 0.15 +
                burnoutScore * 0.10
        );

        String label = healthScore >= 80 ? "Tốt" : healthScore >= 60 ? "Khá" : healthScore >= 40 ? "Cảnh báo" : "Nguy hiểm";
        String color = healthScore >= 80 ? "green" : healthScore >= 60 ? "yellow" : healthScore >= 40 ? "orange" : "red";

        String recommendation = getRecommendation(healthScore, completionRate, onTimeRate, burnoutScore);

        // Days remaining
        String daysRemaining = "Không xác định";
        if (sprint.getEndDate() != null) {
            long days = ChronoUnit.DAYS.between(LocalDate.now(), sprint.getEndDate());
            if (days >= 0) {
                daysRemaining = "Còn " + days + " ngày";
            } else {
                daysRemaining = "Đã kết thúc " + Math.abs(days) + " ngày trước";
            }
        }

        return SprintHealthDTO.builder()
                .healthScore(healthScore)
                .label(label)
                .color(color)
                .metrics(SprintHealthDTO.HealthMetrics.builder()
                        .completionRate(completionRate)
                        .onTimeRate(onTimeRate)
                        .reworkRate(reworkScore)
                        .velocityAccuracy(velocityAccuracy)
                        .burnoutRisk(burnoutRisk)
                        .build())
                .recommendation(recommendation)
                .sprint(SprintHealthDTO.SprintInfo.builder()
                        .sprintId(sprint.getSprintId())
                        .name(sprint.getName())
                        .actualHours(actualHours)
                        .estimatedHours(estimatedHours)
                        .daysRemaining(daysRemaining)
                        .status(sprint.getStatus().name())
                        .build())
                .build();
    }

    private SprintHealthDTO buildEmptyHealth(Sprint sprint) {
        return SprintHealthDTO.builder()
                .healthScore(50)
                .label("Không có dữ liệu")
                .color("gray")
                .metrics(SprintHealthDTO.HealthMetrics.builder()
                        .completionRate(0).onTimeRate(0).reworkRate(100).velocityAccuracy(50).burnoutRisk(0).build())
                .recommendation("Chưa có issue nào trong sprint")
                .sprint(SprintHealthDTO.SprintInfo.builder()
                        .sprintId(sprint.getSprintId())
                        .name(sprint.getName())
                        .actualHours(BigDecimal.ZERO)
                        .estimatedHours(BigDecimal.ZERO)
                        .daysRemaining("Không xác định")
                        .status(sprint.getStatus().name())
                        .build())
                .build();
    }

    private String getRecommendation(int score, int completion, int onTime, int burnout) {
        if (score >= 80) return "Sprint đang tốt, duy trì nhịp độ hiện tại";
        if (score >= 60) return "Cân bằng workload, chú ý deadline cho các task còn lại";
        if (score >= 40) {
            if (onTime < 50) return "Nhiều task trễ hạn, cần review lại plan";
            if (burnout < 70) return "Rủi ro kiệt sức cao, cần giảm tải cho team";
            return "Cần review lại sprint plan, có risk trễ deadline";
        }
        return "Sprint có vấn đề nghiêm trọng, cần can thiệp ngay";
    }
}
