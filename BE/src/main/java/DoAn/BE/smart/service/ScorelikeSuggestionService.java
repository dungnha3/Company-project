package DoAn.BE.smart.service;

import DoAn.BE.project.entity.*;
import DoAn.BE.project.repository.*;
import DoAn.BE.hrm.entity.Review;
import DoAn.BE.hrm.repository.ReviewRepository;
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
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ScorelikeSuggestionService {

    private final IssueRepository issueRepository;
    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectRepository projectRepository;
    private final EmployeeRepository employeeRepository;

    /**
     * Suggest a quick score for an issue, using ML-based weighting when sufficient
     * historical data exists. Falls back to heuristic scoring when data is sparse.
     *
     * Scoring model:
     *   suggestedScore = w1*empHistory + w2*teamBenchmark + w3*complexity + w4*deadline + w5*rework
     *
     * Weights are data-driven when n >= 10:
     *   w1 = min(0.5 + n/40, 0.75)  // employee history weight grows with data
     *   w2 = 0.25                    // team benchmark
     *   w3 = 0.15                    // complexity factor
     *   w4 = 0.10                    // deadline factor
     *   w5 = 0.10                    // rework factor
     *
     * Below n < 10: uses heuristic weights (fixed 70/30 employee/team split).
     */
    public ScoreSuggestionDTO suggestQuickScore(Long issueId) {
        Issue issue = issueRepository.findById(issueId).orElse(null);
        if (issue == null) {
            return ScoreSuggestionDTO.builder()
                    .suggestedScore(BigDecimal.valueOf(7.0))
                    .confidence("low")
                    .reasons(List.of(ScoreSuggestionDTO.ScoreReason.builder()
                            .factor("error").label("Không tìm thấy issue").impact(0).type("info").build()))
                    .build();
        }

        List<ScoreSuggestionDTO.ScoreReason> reasons = new ArrayList<>();

        Long empId = issue.getAssignee() != null ? getEmployeeId(issue.getAssignee()) : null;
        Long projectId = issue.getProject() != null ? issue.getProject().getProjectId() : null;

        // Count data points for confidence
        int empReviews = empId != null ? reviewRepository.findApprovedReviewsByEmployee(empId).size() : 0;
        int teamReviews = projectId != null ? reviewRepository.findByProjectId(projectId).size() : 0;
        int totalDataPoints = empReviews + teamReviews;

        // ── Factor 1: Employee historical score (primary signal) ──────────────
        double empScore = 7.0;
        if (empId != null) {
            BigDecimal empAvg = reviewRepository.getAverageScoreByEmployee(empId);
            if (empAvg != null) {
                empScore = empAvg.doubleValue();
                reasons.add(0, ScoreSuggestionDTO.ScoreReason.builder()
                        .factor("empHistory")
                        .label("Điểm TB nhân viên (" + empReviews + " review): " + empAvg)
                        .impact(0)
                        .type("positive")
                        .build());
            }
        }

        // ── Factor 2: Team benchmark ─────────────────────────────────────────
        double teamScore = 7.0;
        if (projectId != null) {
            List<Review> teamReviewsList = reviewRepository.findByProjectId(projectId);
            if (!teamReviewsList.isEmpty()) {
                teamScore = teamReviewsList.stream()
                        .map(r -> r.getTotalScore() != null ? r.getTotalScore() : BigDecimal.ZERO)
                        .reduce(BigDecimal.ZERO, BigDecimal::add)
                        .divide(BigDecimal.valueOf(teamReviewsList.size()), 1, RoundingMode.HALF_UP)
                        .doubleValue();
                reasons.add(ScoreSuggestionDTO.ScoreReason.builder()
                        .factor("teamBenchmark")
                        .label("Benchmark team (" + teamReviewsList.size() + " review): " + BigDecimal.valueOf(teamScore).setScale(1, RoundingMode.HALF_UP))
                        .impact(0)
                        .type("info")
                        .build());
            }
        }

        // ── Factor 3: Complexity adjustment ─────────────────────────────────
        double complexityAdj = 0;
        int weight = issue.getWeight() != null ? issue.getWeight() : 5;
        if (weight >= 8) {
            complexityAdj = 0.5;
            reasons.add(ScoreSuggestionDTO.ScoreReason.builder()
                    .factor("complexity").label("Task weight cao (" + weight + ")").impact(complexityAdj).type("positive").build());
        } else if (weight <= 3) {
            complexityAdj = -0.5;
            reasons.add(ScoreSuggestionDTO.ScoreReason.builder()
                    .factor("complexity").label("Task weight thấp (" + weight + ")").impact(complexityAdj).type("negative").build());
        }

        // ── Factor 4: Deadline adjustment ───────────────────────────────────
        double deadlineAdj = 0;
        LocalDate due = issue.getDueDate();
        if (due != null) {
            long daysUntil = ChronoUnit.DAYS.between(LocalDate.now(), due);
            if (daysUntil < 0) {
                deadlineAdj = -1.5;
                reasons.add(ScoreSuggestionDTO.ScoreReason.builder()
                        .factor("deadline").label("Trễ deadline (" + Math.abs(daysUntil) + " ngày)").impact(deadlineAdj).type("negative").build());
            } else if (daysUntil <= 1) {
                deadlineAdj = -0.5;
                reasons.add(ScoreSuggestionDTO.ScoreReason.builder()
                        .factor("deadline").label("Sắp deadline (1 ngày)").impact(deadlineAdj).type("warning").build());
            } else if (daysUntil <= 3) {
                deadlineAdj = 0;
                reasons.add(ScoreSuggestionDTO.ScoreReason.builder()
                        .factor("deadline").label("Gần deadline (" + daysUntil + " ngày)").impact(0).type("warning").build());
            }
        }

        // ── Factor 5: Rework adjustment ──────────────────────────────────────
        double reworkAdj = 0;
        int rework = issue.getReworkCount() != null ? issue.getReworkCount() : 0;
        if (rework > 0) {
            reworkAdj = -rework * 0.5;
            reasons.add(ScoreSuggestionDTO.ScoreReason.builder()
                    .factor("rework").label("Có " + rework + " lần rework").impact(reworkAdj).type("negative").build());
        }

        // ── Combine with data-driven weights ────────────────────────────────
        double suggested;
        if (totalDataPoints >= 10) {
            // ML-style weighted combination
            double wEmp = Math.min(0.5 + (double) empReviews / 40.0, 0.75);
            double wTeam = 0.25;
            double wOther = 1.0 - wEmp - wTeam;

            suggested = wEmp * empScore + wTeam * teamScore + wOther * (7.0 + complexityAdj + deadlineAdj + reworkAdj);
            suggested = Math.max(1.0, Math.min(10.0, suggested));
        } else if (totalDataPoints >= 3) {
            // Heuristic: 70% employee, 30% team + adjustments
            suggested = 0.7 * empScore + 0.3 * (teamScore + complexityAdj + deadlineAdj + reworkAdj);
            suggested = Math.max(1.0, Math.min(10.0, suggested));
        } else {
            // No data: pure baseline + task factors
            suggested = 7.0 + complexityAdj + deadlineAdj + reworkAdj;
            suggested = Math.max(1.0, Math.min(10.0, suggested));
        }

        BigDecimal suggestedBd = BigDecimal.valueOf(suggested).setScale(1, RoundingMode.HALF_UP);
        String confidence = totalDataPoints >= 10 ? "high"
                : totalDataPoints >= 3 ? "medium"
                : "low";
        String method = totalDataPoints >= 10 ? "ML-weighted"
                : totalDataPoints >= 3 ? "Heuristic"
                : "Baseline";

        return ScoreSuggestionDTO.builder()
                .suggestedScore(suggestedBd)
                .confidence(confidence)
                .reasons(reasons)
                .build();
    }

    public ScoreSuggestionDTO suggestFullReview(Long employeeId, String reviewPeriod) {
        List<Review> quickReviews = reviewRepository.getQuickScoreReviews(employeeId);
        List<Review> allApproved = reviewRepository.findApprovedReviewsByEmployee(employeeId);

        // Employee insights
        int totalTasks = quickReviews.size();
        BigDecimal avgScore = BigDecimal.ZERO;
        BigDecimal teamAvg = BigDecimal.ZERO;
        BigDecimal prevAvg = BigDecimal.ZERO;
        int onTimeRate = 80;
        int reworkCount = 0;
        BigDecimal avgTechnical = BigDecimal.ZERO;
        BigDecimal avgAttitude = BigDecimal.ZERO;

        // Resolve employee -> user for issue lookup
        User employeeUser = null;
        List<User> teamMembers = new ArrayList<>();
        Set<Long> projectIds = new HashSet<>();

        if (!allApproved.isEmpty()) {
            avgScore = allApproved.stream()
                    .map(r -> r.getTotalScore() != null ? r.getTotalScore() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .divide(BigDecimal.valueOf(allApproved.size()), 1, RoundingMode.HALF_UP);

            avgTechnical = allApproved.stream()
                    .map(r -> r.getTechnicalScore() != null ? r.getTechnicalScore() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .divide(BigDecimal.valueOf(allApproved.size()), 1, RoundingMode.HALF_UP);

            avgAttitude = allApproved.stream()
                    .map(r -> r.getAttitudeScore() != null ? r.getAttitudeScore() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .divide(BigDecimal.valueOf(allApproved.size()), 1, RoundingMode.HALF_UP);

            // Resolve employee user for issue-based stats
            Review firstReview = allApproved.get(0);
            if (firstReview.getEmployee() != null) {
                var emp = employeeRepository.findById(firstReview.getEmployee().getEmployeeId()).orElse(null);
                if (emp != null && emp.getUser() != null) {
                    employeeUser = emp.getUser();
                }
            }

            // Team average
            for (Review r : allApproved) {
                if (r.getProjectId() != null) projectIds.add(r.getProjectId());
            }
            BigDecimal totalTeam = BigDecimal.ZERO;
            int teamCount = 0;
            for (Long pid : projectIds) {
                List<Review> projReviews = reviewRepository.findByProjectId(pid);
                for (Review r : projReviews) {
                    if (r.getTotalScore() != null) {
                        totalTeam = totalTeam.add(r.getTotalScore());
                        teamCount++;
                    }
                }
                // Collect team members for teamAvg
                List<ProjectMember> members = projectMemberRepository.findByProject_ProjectId(pid);
                for (ProjectMember pm : members) {
                    if (pm.getUser() != null) teamMembers.add(pm.getUser());
                }
            }
            if (teamCount > 0) {
                teamAvg = totalTeam.divide(BigDecimal.valueOf(teamCount), 1, RoundingMode.HALF_UP);
            }

            // Calculate onTimeRate and reworkCount from issues
            if (employeeUser != null) {
                List<Issue> userIssues = issueRepository.findByAssignee_UserId(employeeUser.getUserId());
                List<Issue> completedIssues = userIssues.stream()
                        .filter(i -> i.getIssueStatus() != null && "Done".equals(i.getIssueStatus().getName()))
                        .toList();
                if (!completedIssues.isEmpty()) {
                    long onTime = completedIssues.stream()
                            .filter(i -> i.getCompletedAt() != null && i.getDueDate() != null)
                            .filter(i -> !i.getCompletedAt().toLocalDate().isAfter(i.getDueDate()))
                            .count();
                    onTimeRate = completedIssues.isEmpty() ? 0
                            : (int) Math.round(onTime * 100.0 / completedIssues.size());
                    reworkCount = completedIssues.stream()
                            .mapToInt(i -> i.getReworkCount() != null ? i.getReworkCount() : 0)
                            .sum();
                }
            }

            // Previous period
            String[] parts = reviewPeriod.split("-");
            if (parts.length == 2) {
                try {
                    int periodNum = Integer.parseInt(parts[0].replaceAll("[^0-9]", ""));
                    int year = Integer.parseInt(parts[1]);
                    String prevPeriod = (periodNum - 1) + "-" + year;
                    if (periodNum == 1) prevPeriod = "4-" + (year - 1);
                    List<Review> prevReviews = reviewRepository.findByReviewPeriodOrderByCreatedAtDesc(prevPeriod);
                    if (!prevReviews.isEmpty()) {
                        prevAvg = prevReviews.stream()
                                .filter(r -> r.getEmployee() != null && r.getEmployee().getEmployeeId().equals(employeeId))
                                .map(r -> r.getTotalScore() != null ? r.getTotalScore() : BigDecimal.ZERO)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                        long prevCount = prevReviews.stream()
                                .filter(r -> r.getEmployee() != null && r.getEmployee().getEmployeeId().equals(employeeId))
                                .count();
                        if (prevCount > 0) {
                            prevAvg = prevAvg.divide(BigDecimal.valueOf(prevCount), 1, RoundingMode.HALF_UP);
                        }
                    }
                } catch (Exception ignored) {}
            }
        }

        BigDecimal trend = BigDecimal.ZERO;
        if (prevAvg.compareTo(BigDecimal.ZERO) > 0) {
            trend = avgScore.subtract(prevAvg).setScale(1, RoundingMode.HALF_UP);
        }

        // Suggested scores
        BigDecimal technical = avgTechnical.compareTo(BigDecimal.ZERO) > 0 ? avgTechnical : avgScore.compareTo(BigDecimal.ZERO) > 0 ? avgScore : BigDecimal.valueOf(7.0);

        // Attitude: base on team avg, boost if technical is above team
        BigDecimal attitude = BigDecimal.valueOf(7.5);
        if (teamAvg.compareTo(BigDecimal.ZERO) > 0) {
            attitude = teamAvg;
            if (technical.compareTo(teamAvg) > 0) {
                attitude = attitude.add(BigDecimal.valueOf(0.3));
            }
        } else if (avgAttitude.compareTo(BigDecimal.ZERO) > 0) {
            attitude = avgAttitude;
        }

        BigDecimal softSkills = teamAvg.compareTo(BigDecimal.ZERO) > 0 ? teamAvg : BigDecimal.valueOf(7.0);
        BigDecimal teamwork = teamAvg.compareTo(BigDecimal.ZERO) > 0 ? teamAvg : BigDecimal.valueOf(7.0);

        ScoreSuggestionDTO.ScoreBasis dtoBasis = new ScoreSuggestionDTO.ScoreBasis();
        dtoBasis.setTechnicalScore("Avg QuickScore");
        dtoBasis.setAttitudeScore(attitude.compareTo(BigDecimal.valueOf(7.5)) > 0 ? "Trên team avg" : "Team avg");
        dtoBasis.setSoftSkillsScore("Team avg");
        dtoBasis.setTeamworkScore("Team avg");

        return ScoreSuggestionDTO.builder()
                .employeeInsights(ScoreSuggestionDTO.EmployeeInsights.builder()
                        .totalTasks(totalTasks)
                        .averageScore(avgScore.compareTo(BigDecimal.ZERO) > 0 ? avgScore : null)
                        .previousPeriodScore(prevAvg.compareTo(BigDecimal.ZERO) > 0 ? prevAvg : null)
                        .trend(trend)
                        .onTimeRate(onTimeRate)
                        .reworkCount(reworkCount)
                        .teamAverage(teamAvg.compareTo(BigDecimal.ZERO) > 0 ? teamAvg : null)
                        .build())
                .suggestedScores(ScoreSuggestionDTO.SuggestedScores.builder()
                        .technicalScore(technical.setScale(1, RoundingMode.HALF_UP))
                        .attitudeScore(attitude.setScale(1, RoundingMode.HALF_UP))
                        .softSkillsScore(softSkills.setScale(1, RoundingMode.HALF_UP))
                        .teamworkScore(teamwork.setScale(1, RoundingMode.HALF_UP))
                        .basis(dtoBasis)
                        .build())
                .build();
    }

    private Long getEmployeeId(User user) {
        if (user == null) return null;
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null) return null;
        return employeeRepository.findByUser_UserIdAndCompany_CompanyId(user.getUserId(), companyId)
                .map(e -> e.getEmployeeId())
                .orElse(null);
    }
}
