package DoAn.BE.smart.service;

import DoAn.BE.project.entity.*;
import DoAn.BE.project.repository.*;
import DoAn.BE.hrm.entity.Review;
import DoAn.BE.hrm.repository.ReviewRepository;
import DoAn.BE.hrm.repository.LeaveRequestRepository;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import DoAn.BE.smart.dto.*;
import DoAn.BE.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class TaskAssignmentService {

    private final IssueRepository issueRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ReviewRepository reviewRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;

    // Weights for scoring: W1=30, W2=20, W3=20, W4=10, W5=10, W6=5, W7=5
    private static final int W_SKILL = 30;
    private static final int W_WORKLOAD = 20;
    private static final int W_HISTORY = 20;
    private static final int W_AVAIL = 10;
    private static final int W_DEADLINE = 10;
    private static final int W_BALANCE = 5;
    private static final int W_RELIABILITY = 5;

    public List<TaskAssignmentDTO> getAssignments(Long projectId, Long userId) {
        if (projectId == null) return Collections.emptyList();

        List<Issue> backlogIssues = issueRepository.findByProject_ProjectIdAndAssigneeIsNull(projectId);
        if (backlogIssues.isEmpty()) return Collections.emptyList();

        List<ProjectMember> members = projectMemberRepository.findByProject_ProjectId(projectId);
        if (members.isEmpty()) return Collections.emptyList();

        List<TaskAssignmentDTO> results = new ArrayList<>();

        for (Issue issue : backlogIssues) {
            TaskAssignmentDTO dto = buildAssignment(issue, members);
            if (dto != null) results.add(dto);
        }

        return results;
    }

    private TaskAssignmentDTO buildAssignment(Issue issue, List<ProjectMember> members) {
        List<ScoredMember> scored = new ArrayList<>();

        for (ProjectMember pm : members) {
            User user = pm.getUser();
            if (user == null) continue;

            int totalScore = calculateScore(issue, user, members);
            TaskAssignmentDTO.ScoreBreakdown breakdown = getBreakdown(issue, user, members);

            scored.add(new ScoredMember(user, totalScore, breakdown));
        }

        scored.sort((a, b) -> b.score - a.score);
        if (scored.isEmpty()) return null;

        ScoredMember best = scored.get(0);

        TaskAssignmentDTO.SuggestedAssignee suggested = TaskAssignmentDTO.SuggestedAssignee.builder()
                .userId(best.user.getUserId())
                .username(best.user.getUsername())
                .fullName(best.user.getFullName())
                .score(best.score)
                .breakdown(best.breakdown)
                .build();

        List<TaskAssignmentDTO.AlternativeAssignee> alts = new ArrayList<>();
        for (int i = 1; i < Math.min(3, scored.size()); i++) {
            ScoredMember alt = scored.get(i);
            if (best.score - alt.score <= 20) {
                alts.add(TaskAssignmentDTO.AlternativeAssignee.builder()
                        .userId(alt.user.getUserId())
                        .username(alt.user.getUsername())
                        .fullName(alt.user.getFullName())
                        .score(alt.score)
                        .build());
            }
        }

        boolean isOverdue = issue.getDueDate() != null
                && issue.getDueDate().isBefore(LocalDate.now())
                && !issue.isDone();

        return TaskAssignmentDTO.builder()
                .issueId(issue.getIssueId())
                .issueKey(issue.getIssueKey())
                .title(issue.getTitle())
                .issueType(issue.getIssueType() != null ? issue.getIssueType().name() : "TASK")
                .priority(issue.getPriority() != null ? issue.getPriority().name() : "MEDIUM")
                .weight(issue.getWeight())
                .dueDate(issue.getDueDate())
                .reworkCount(issue.getReworkCount())
                .isOverdue(isOverdue)
                .suggestedAssignee(suggested)
                .alternatives(alts)
                .build();
    }

    private int calculateScore(Issue issue, User user, List<ProjectMember> members) {
        int skillScore = calcSkillScore(issue, user);
        int workloadScore = calcWorkloadScore(user);
        int historyScore = calcHistoryScore(user);
        int availScore = calcAvailabilityScore(user, issue.getDueDate());
        int deadlineScore = calcDeadlineScore(issue, members);
        int balanceScore = calcBalanceScore(user, members);
        int reliabilityScore = calcReliabilityScore(user);

        return skillScore * W_SKILL / 100
                + workloadScore * W_WORKLOAD / 100
                + historyScore * W_HISTORY / 100
                + availScore * W_AVAIL / 100
                + deadlineScore * W_DEADLINE / 100
                + balanceScore * W_BALANCE / 100
                + reliabilityScore * W_RELIABILITY / 100;
    }

    private TaskAssignmentDTO.ScoreBreakdown getBreakdown(Issue issue, User user, List<ProjectMember> members) {
        return TaskAssignmentDTO.ScoreBreakdown.builder()
                .skillMatch(calcSkillScore(issue, user))
                .workload(calcWorkloadScore(user))
                .history(calcHistoryScore(user))
                .availability(calcAvailabilityScore(user, issue.getDueDate()))
                .deadline(calcDeadlineScore(issue, members))
                .loadBalance(calcBalanceScore(user, members))
                .reliability(calcReliabilityScore(user))
                .build();
    }

    private int calcSkillScore(Issue issue, User user) {
        Long empId = getEmployeeId(user);
        if (empId == null) return 50; // neutral

        BigDecimal avg = reviewRepository.getAverageTechnicalScore(empId);
        if (avg == null) return 50;

        // Boost for heavy tasks / bugs
        int weight = issue.getWeight() != null ? issue.getWeight() : 5;
        String titleLower = (issue.getTitle() != null ? issue.getTitle().toLowerCase() : "");

        if (weight >= 7 || "BUG".equals(issue.getIssueType().name())) {
            return Math.min(avg.multiply(BigDecimal.TEN).intValue() + 10, 100);
        }
        if (titleLower.contains("design") || titleLower.contains("ui") || titleLower.contains("ux")) {
            return Math.min(avg.multiply(BigDecimal.TEN).intValue() + 5, 100);
        }
        return Math.min(avg.multiply(BigDecimal.TEN).intValue(), 100);
    }

    private int calcWorkloadScore(User user) {
        List<Issue> active = issueRepository.findByAssignee_UserId(user.getUserId());
        int activeCount = (int) active.stream()
                .filter(i -> {
                    String name = i.getIssueStatus() != null ? i.getIssueStatus().getName() : "";
                    return !"Done".equals(name);
                })
                .count();

        BigDecimal totalHours = active.stream()
                .filter(i -> i.getIssueStatus() != null && !"Done".equals(i.getIssueStatus().getName()))
                .map(i -> i.getEstimatedHours() != null ? i.getEstimatedHours() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return Math.max(0, 100 - activeCount * 15 - totalHours.divide(BigDecimal.TEN, 0, RoundingMode.HALF_UP).intValue());
    }

    private int calcHistoryScore(User user) {
        Long empId = getEmployeeId(user);
        if (empId == null) return 50;

        List<Review> reviews = reviewRepository.findApprovedReviewsByEmployee(empId);
        if (reviews.isEmpty()) return 50;

        BigDecimal avg = reviews.stream()
                .map(r -> r.getTotalScore() != null ? r.getTotalScore() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(reviews.size()), 1, RoundingMode.HALF_UP);

        return Math.min(avg.multiply(BigDecimal.TEN).intValue() / 2 + 26, 100);
    }

    private int calcAvailabilityScore(User user, LocalDate dueDate) {
        if (dueDate == null) {
            return leaveRequestRepository.isUserOnLeave(user.getUserId(), LocalDate.now()) ? 0 : 80;
        }
        return leaveRequestRepository.isUserOnLeave(user.getUserId(), dueDate) ? 0 : 80;
    }

    private int calcDeadlineScore(Issue issue, List<ProjectMember> members) {
        LocalDate due = issue.getDueDate();
        if (due == null || due.isAfter(LocalDate.now().plusDays(3))) return 50;

        // Urgent deadline → pick person with highest workload availability
        int bestWorkload = 0;
        for (ProjectMember pm : members) {
            if (pm.getUser() != null) {
                int ws = calcWorkloadScore(pm.getUser());
                if (ws > bestWorkload) bestWorkload = ws;
            }
        }
        return bestWorkload;
    }

    private int calcBalanceScore(User user, List<ProjectMember> members) {
        Integer myWeightNullable = issueRepository.sumActiveWeightByAssignee(user.getUserId());
        int myWeight = myWeightNullable != null ? myWeightNullable : 0;

        int totalWeight = 0;
        int count = 0;
        for (ProjectMember pm : members) {
            if (pm.getUser() != null) {
                Integer w = issueRepository.sumActiveWeightByAssignee(pm.getUser().getUserId());
                totalWeight += (w != null ? w : 0);
                count++;
            }
        }
        int avgWeight = count > 0 ? totalWeight / count : 0;

        if (myWeight < avgWeight) return Math.min(50 + (avgWeight - myWeight) * 3, 100);
        return Math.max(50 - (myWeight - avgWeight) * 3, 10);
    }

    private int calcReliabilityScore(User user) {
        Long empId = getEmployeeId(user);
        if (empId == null) return 70;

        List<Review> reviews = reviewRepository.findApprovedReviewsByEmployee(empId);
        if (reviews.isEmpty()) return 70;

        int avgRework = reviews.stream()
                .mapToInt(r -> {
                    List<Issue> issues = issueRepository.findByAssignee_UserId(user.getUserId());
                    return issues.stream().mapToInt(i -> i.getReworkCount() != null ? i.getReworkCount() : 0).sum();
                })
                .sum() / Math.max(reviews.size(), 1);

        return Math.max(70 - avgRework * 10, 20);
    }

    private Long getEmployeeId(User user) {
        if (user == null) return null;
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null) return null;
        return employeeRepository.findByUser_UserIdAndCompany_CompanyId(user.getUserId(), companyId)
                .map(e -> e.getEmployeeId())
                .orElse(null);
    }

    private static class ScoredMember {
        User user;
        int score;
        TaskAssignmentDTO.ScoreBreakdown breakdown;

        ScoredMember(User user, int score, TaskAssignmentDTO.ScoreBreakdown breakdown) {
            this.user = user;
            this.score = score;
            this.breakdown = breakdown;
        }
    }
}
