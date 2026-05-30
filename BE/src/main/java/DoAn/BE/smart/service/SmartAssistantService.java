package DoAn.BE.smart.service;

import DoAn.BE.project.entity.*;
import DoAn.BE.project.repository.*;
import DoAn.BE.hrm.repository.LeaveRequestRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import DoAn.BE.smart.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class SmartAssistantService {

    private final SprintRepository sprintRepository;
    private final IssueRepository issueRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final UserRepository userRepository;
    private final SprintHealthService sprintHealthService;
    private final WorkloadAnalysisService workloadAnalysisService;
    private final ProjectRiskService projectRiskService;

    public SmartAssistantSummaryDTO getSummary(Long projectId, Long sprintId, Long userId) {
        List<String> insights = new ArrayList<>();

        SprintHealthDTO sprintHealth = null;
        WorkloadAnalysisDTO workload = null;
        ProjectRiskDTO risk = null;
        int backlogCount = 0;
        List<SmartAssistantSummaryDTO.DeadlineWarning> warnings = new ArrayList<>();

        if (projectId != null) {
            // Sprint health
            if (sprintId != null) {
                sprintHealth = sprintHealthService.getHealth(sprintId);
                if (sprintHealth != null && sprintHealth.getHealthScore() < 60) {
                    insights.add("Sprint có sức khỏe thấp, cần cân bằng lại");
                }
            } else {
                Sprint sprint = sprintRepository.findFirstByProject_ProjectIdAndStatus(projectId, Sprint.SprintStatus.ACTIVE)
                        .orElse(null);
                if (sprint != null) {
                    sprintHealth = sprintHealthService.getHealth(sprint.getSprintId());
                }
            }

            // Workload
            workload = workloadAnalysisService.getWorkload(projectId);
            if (workload != null && workload.getMembers() != null) {
                for (WorkloadAnalysisDTO.MemberWorkload m : workload.getMembers()) {
                    if ("QUÁ_TẢI".equals(m.getWorkloadLevel())) {
                        insights.add(m.getFullName() + " đang quá tải (" + m.getActiveTasks() + " task active)");
                    }
                }
            }

            // Risk
            risk = projectRiskService.getRisk(projectId);
            if (risk != null && risk.getRiskFactors() != null) {
                for (ProjectRiskDTO.RiskFactor f : risk.getRiskFactors()) {
                    if (f.getScore() >= 30) {
                        insights.add("⚠️ " + f.getLabel());
                    }
                }
            }

            // Backlog count
            List<Issue> backlog = issueRepository.findByProject_ProjectIdAndAssigneeIsNull(projectId);
            backlogCount = backlog.size();
            if (backlogCount > 0) {
                insights.add(backlogCount + " issue chưa được giao việc");
            }

            // Deadline warnings
            LocalDate today = LocalDate.now();
            LocalDate threeDaysLater = today.plusDays(3);
            List<Issue> allIssues = issueRepository.findByProject_ProjectId(projectId);
            for (Issue issue : allIssues) {
                if (issue.getDueDate() != null && (issue.getIssueStatus() == null || !"Done".equals(issue.getIssueStatus().getName()))
                        && issue.getAssignee() != null) {
                    if (issue.getDueDate().isBefore(today)) {
                        warnings.add(SmartAssistantSummaryDTO.DeadlineWarning.builder()
                                .issueId(issue.getIssueId())
                                .issueKey(issue.getIssueKey())
                                .title(issue.getTitle())
                                .type("overdue")
                                .build());
                    } else if (issue.getDueDate().isBefore(threeDaysLater)) {
                        warnings.add(SmartAssistantSummaryDTO.DeadlineWarning.builder()
                                .issueId(issue.getIssueId())
                                .issueKey(issue.getIssueKey())
                                .title(issue.getTitle())
                                .type("near_deadline")
                                .build());
                    }
                }
            }
        }

        return SmartAssistantSummaryDTO.builder()
                .sprintHealth(sprintHealth)
                .workload(workload)
                .projectRisk(risk)
                .backlogCount(backlogCount)
                .deadlineWarnings(warnings)
                .topInsights(insights)
                .build();
    }
}
