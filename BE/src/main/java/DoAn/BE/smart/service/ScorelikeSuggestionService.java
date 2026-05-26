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

        double base = 7.0;
        List<ScoreSuggestionDTO.ScoreReason> reasons = new ArrayList<>();

        // Rework penalty
        int rework = issue.getReworkCount() != null ? issue.getReworkCount() : 0;
        if (rework > 0) {
            base -= rework * 0.5;
            reasons.add(ScoreSuggestionDTO.ScoreReason.builder()
                    .factor("rework").label("Có " + rework + " lần rework").impact(-rework * 0.5).type("negative").build());
        }

        // Weight bonus/penalty
        int weight = issue.getWeight() != null ? issue.getWeight() : 5;
        if (weight >= 8) {
            base += 0.5;
            reasons.add(ScoreSuggestionDTO.ScoreReason.builder()
                    .factor("weight").label("Task weight cao (" + weight + ")").impact(0.5).type("positive").build());
        } else if (weight <= 3) {
            base -= 0.5;
            reasons.add(ScoreSuggestionDTO.ScoreReason.builder()
                    .factor("weight").label("Task weight thấp (" + weight + ")").impact(-0.5).type("negative").build());
        }

        // Deadline check
        LocalDate due = issue.getDueDate();
        if (due != null) {
            long daysUntil = ChronoUnit.DAYS.between(LocalDate.now(), due);
            if (daysUntil < 0) {
                base -= 1.5;
                reasons.add(ScoreSuggestionDTO.ScoreReason.builder()
                        .factor("deadline").label("Trễ deadline").impact(-1.5).type("negative").build());
            } else if (daysUntil <= 1) {
                base -= 0.5;
                reasons.add(ScoreSuggestionDTO.ScoreReason.builder()
                        .factor("deadline").label("Sắp deadline (1 ngày)").impact(-0.5).type("warning").build());
            } else if (daysUntil <= 3) {
                reasons.add(ScoreSuggestionDTO.ScoreReason.builder()
                        .factor("deadline").label("Gần deadline (" + daysUntil + " ngày)").impact(0).type("warning").build());
            }
        }

        // Employee historical score
        if (issue.getAssignee() != null) {
            Long empId = getEmployeeId(issue.getAssignee());
            if (empId != null) {
                BigDecimal empAvg = reviewRepository.getAverageScoreByEmployee(empId);
                if (empAvg != null) {
                    base = (base + empAvg.doubleValue()) / 2;
                    reasons.add(ScoreSuggestionDTO.ScoreReason.builder()
                            .factor("history").label("Điểm TB nhân viên: " + empAvg).impact(0).type("positive").build());
                }
            }
        }

        // Team benchmark
        if (issue.getProject() != null) {
            List<Review> teamReviews = reviewRepository.findByProjectId(issue.getProject().getProjectId());
            if (!teamReviews.isEmpty()) {
                BigDecimal teamAvg = teamReviews.stream()
                        .map(r -> r.getTotalScore() != null ? r.getTotalScore() : BigDecimal.ZERO)
                        .reduce(BigDecimal.ZERO, BigDecimal::add)
                        .divide(BigDecimal.valueOf(teamReviews.size()), 1, RoundingMode.HALF_UP);
                base = base * 0.7 + teamAvg.doubleValue() * 0.3;
                reasons.add(ScoreSuggestionDTO.ScoreReason.builder()
                        .factor("team").label("Benchmark team: " + teamAvg).impact(0).type("info").build());
            }
        }

        // Clamp
        double suggested = Math.max(1.0, Math.min(10.0, base));
        BigDecimal suggestedBd = BigDecimal.valueOf(suggested).setScale(1, RoundingMode.HALF_UP);

        // Confidence
        String confidence = determineConfidence(issue, reasons);

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

        if (!allApproved.isEmpty()) {
            avgScore = allApproved.stream()
                    .map(r -> r.getTotalScore() != null ? r.getTotalScore() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .divide(BigDecimal.valueOf(allApproved.size()), 1, RoundingMode.HALF_UP);

            // Team average
            Set<Long> projectIds = new HashSet<>();
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
            }
            if (teamCount > 0) {
                teamAvg = totalTeam.divide(BigDecimal.valueOf(teamCount), 1, RoundingMode.HALF_UP);
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
                                .filter(r -> r.getEmployee().getEmployeeId().equals(employeeId))
                                .map(r -> r.getTotalScore() != null ? r.getTotalScore() : BigDecimal.ZERO)
                                .reduce(BigDecimal.ZERO, BigDecimal::add)
                                .divide(BigDecimal.valueOf(prevReviews.size()), 1, RoundingMode.HALF_UP);
                    }
                } catch (Exception ignored) {}
            }
        }

        BigDecimal trend = BigDecimal.ZERO;
        if (prevAvg.compareTo(BigDecimal.ZERO) > 0) {
            trend = avgScore.subtract(prevAvg).setScale(1, RoundingMode.HALF_UP);
        }

        // Suggested scores
        BigDecimal technical = avgScore.compareTo(BigDecimal.ZERO) > 0 ? avgScore : BigDecimal.valueOf(7.0);
        BigDecimal attitude = BigDecimal.valueOf(7.5);
        BigDecimal softSkills = teamAvg.compareTo(BigDecimal.ZERO) > 0 ? teamAvg : BigDecimal.valueOf(7.0);
        BigDecimal teamwork = teamAvg.compareTo(BigDecimal.ZERO) > 0 ? teamAvg : BigDecimal.valueOf(7.0);

        ScoreSuggestionDTO.ScoreBasis dtoBasis = new ScoreSuggestionDTO.ScoreBasis();
        dtoBasis.setTechnicalScore("Avg QuickScore");
        dtoBasis.setAttitudeScore("Team avg");
        dtoBasis.setSoftSkillsScore("Team avg");
        dtoBasis.setTeamworkScore("Team avg");
        if (teamAvg.compareTo(BigDecimal.ZERO) > 0 && technical.compareTo(teamAvg) > 0) {
            dtoBasis.setAttitudeScore("Trên team avg");
        }

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

    private String determineConfidence(Issue issue, List<ScoreSuggestionDTO.ScoreReason> reasons) {
        int dataPoints = 0;
        if (issue.getAssignee() != null && issue.getAssignee().getUserId() != null) {
            Long empId = getEmployeeId(issue.getAssignee());
            if (empId != null) {
                List<Review> reviews = reviewRepository.findApprovedReviewsByEmployee(empId);
                dataPoints += reviews.size();
            }
        }
        if (issue.getProject() != null) {
            List<Review> projReviews = reviewRepository.findByProjectId(issue.getProject().getProjectId());
            dataPoints += projReviews.size();
        }

        if (dataPoints >= 10) return "high";
        if (dataPoints >= 3) return "medium";
        return "low";
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
