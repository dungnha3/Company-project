package DoAn.BE.smart.service;

import DoAn.BE.project.entity.*;
import DoAn.BE.project.repository.*;
import DoAn.BE.hrm.repository.LeaveRequestRepository;
import DoAn.BE.smart.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ProjectRiskService {

    private final ProjectRepository projectRepository;
    private final IssueRepository issueRepository;
    private final SprintRepository sprintRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final SprintHealthService sprintHealthService;
    private final WorkloadAnalysisService workloadAnalysisService;

    public ProjectRiskDTO getRisk(Long projectId) {
        if (projectId == null) return null;

        Project project = projectRepository.findById(projectId).orElse(null);
        if (project == null) return null;

        List<ProjectRiskDTO.RiskFactor> factors = new ArrayList<>();
        List<String> recommendations = new ArrayList<>();

        // 1. Deadline Risk (25%)
        LocalDate today = LocalDate.now();
        List<Issue> overdue = issueRepository.findOverdueIssuesWithRelations(today);
        int deadlineRisk = Math.min(overdue.size() * 10, 100);
        if (deadlineRisk > 0) {
            factors.add(ProjectRiskDTO.RiskFactor.builder()
                    .type("deadline").label("Rủi ro deadline")
                    .description(overdue.size() + " issues trễ deadline")
                    .score(deadlineRisk)
                    .severity(deadlineRisk >= 30 ? "high" : deadlineRisk >= 15 ? "medium" : "low")
                    .build());
            recommendations.add("Cần xử lý " + overdue.size() + " issues trễ deadline ngay lập tức");
        }

        // 2. Sprint Health Risk (25%)
        Sprint activeSprint = sprintRepository.findFirstByProject_ProjectIdAndStatus(projectId, Sprint.SprintStatus.ACTIVE)
                .orElse(null);
        int sprintRisk = 0;
        if (activeSprint != null) {
            SprintHealthDTO health = sprintHealthService.getHealth(activeSprint.getSprintId());
            if (health != null) {
                sprintRisk = 100 - health.getHealthScore();
            }
        } else {
            sprintRisk = 30; // no active sprint = moderate risk
        }
        if (sprintRisk >= 20) {
            factors.add(ProjectRiskDTO.RiskFactor.builder()
                    .type("sprint").label("Sức khỏe Sprint")
                    .description(activeSprint != null ? "Sprint '" + activeSprint.getName() + "' có health score thấp"
                            : "Không có sprint đang hoạt động")
                    .score(sprintRisk)
                    .severity(sprintRisk >= 50 ? "high" : sprintRisk >= 30 ? "medium" : "low")
                    .build());
            if (sprintRisk >= 50) {
                recommendations.add("Cần can thiệp sprint: health score dưới 50%");
            }
        }

        // 3. Workload Imbalance Risk (20%)
        WorkloadAnalysisDTO workload = workloadAnalysisService.getWorkload(projectId);
        int imbalance = 100 - workload.getBalanceScore();
        if (imbalance >= 20) {
            factors.add(ProjectRiskDTO.RiskFactor.builder()
                    .type("workload").label("Mất cân bằng workload")
                    .description("Team balance score: " + workload.getBalanceScore() + "%")
                    .score(imbalance)
                    .severity(imbalance >= 50 ? "high" : imbalance >= 30 ? "medium" : "low")
                    .build());
            if (workload.getMembers() != null) {
                for (WorkloadAnalysisDTO.MemberWorkload m : workload.getMembers()) {
                    if ("QUÁ_TẢI".equals(m.getWorkloadLevel())) {
                        recommendations.add(m.getFullName() + " đang quá tải với " + m.getActiveTasks() + " task");
                    }
                }
            }
        }

        // 4. Scope Creep Risk (15%)
        int scopeRisk = 0;
        if (activeSprint != null) {
            List<Issue> sprintIssues = issueRepository.findBySprint_SprintId(activeSprint.getSprintId());
            int totalIssues = sprintIssues.size();
            int estimatedAtStart = Math.max(totalIssues - 3, 1); // rough estimate
            if (totalIssues > estimatedAtStart * 1.2) {
                scopeRisk = 50;
                factors.add(ProjectRiskDTO.RiskFactor.builder()
                        .type("scope").label("Scope Creep")
                        .description("Số lượng issue tăng " + ((totalIssues * 100 / estimatedAtStart) - 100) + "% so với dự kiến")
                        .score(scopeRisk)
                        .severity("medium")
                        .build());
                recommendations.add("Có dấu hiệu scope creep - số lượng issue tăng ngoài kế hoạch");
            }
        }

        // 5. Team Capacity Risk (15%)
        int capacityRisk = 0;
        if (activeSprint != null && activeSprint.getStartDate() != null && activeSprint.getEndDate() != null) {
            List<ProjectMember> members = projectMemberRepository.findByProject_ProjectId(projectId);
            int onLeave = 0;
            for (ProjectMember pm : members) {
                if (pm.getUser() != null) {
                    if (leaveRequestRepository.hasOverlappingLeaveByUser(
                            pm.getUser().getUserId(), activeSprint.getStartDate(), activeSprint.getEndDate())) {
                        onLeave++;
                    }
                }
            }
            if (members.size() > 0) {
                capacityRisk = (int) ((double) onLeave / members.size() * 100);
            }
        }
        if (capacityRisk >= 15) {
            factors.add(ProjectRiskDTO.RiskFactor.builder()
                    .type("capacity").label("Giảm năng lực team")
                    .description(capacityRisk + "% thành viên đang nghỉ phép trong sprint")
                    .score(capacityRisk)
                    .severity(capacityRisk >= 40 ? "high" : "medium")
                    .build());
        }

        // Total risk score
        int totalRisk = (int) (
                deadlineRisk * 0.25 +
                sprintRisk * 0.25 +
                imbalance * 0.20 +
                scopeRisk * 0.15 +
                capacityRisk * 0.15
        );

        String label = totalRisk >= 70 ? "Nghiêm trọng" : totalRisk >= 50 ? "Cao" : totalRisk >= 25 ? "Trung bình" : "Thấp";
        String color = totalRisk >= 70 ? "red" : totalRisk >= 50 ? "orange" : totalRisk >= 25 ? "yellow" : "green";

        // Default recommendations if none generated
        if (recommendations.isEmpty()) {
            recommendations.add("Dự án đang trong tình trạng tốt, duy trì nhịp độ hiện tại");
        }

        return ProjectRiskDTO.builder()
                .riskScore(totalRisk)
                .label(label)
                .color(color)
                .riskFactors(factors)
                .recommendations(recommendations)
                .build();
    }
}
