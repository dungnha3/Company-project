package DoAn.BE.hrm.service;

import DoAn.BE.hrm.dto.PerformanceRankingDTO;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.entity.Review;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.hrm.repository.ReviewRepository;
import DoAn.BE.project.entity.Issue;
import DoAn.BE.project.entity.ProjectMember;
import DoAn.BE.project.repository.IssueRepository;
import DoAn.BE.project.repository.ProjectMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PerformanceService {

    private final ProjectMemberRepository projectMemberRepository;
    private final IssueRepository issueRepository;
    private final ReviewRepository reviewRepository;
    private final EmployeeRepository employeeRepository;

    public List<PerformanceRankingDTO> getProjectPerformanceRanking(Long projectId) {
        List<ProjectMember> members = projectMemberRepository.findByProject_ProjectId(projectId);
        List<PerformanceRankingDTO> rankings = new ArrayList<>();

        // Find max volume to normalize the score to 10
        BigDecimal maxVolume = BigDecimal.ONE; // Avoid division by zero
        List<MemberStats> statsList = new ArrayList<>();

        for (ProjectMember pm : members) {
            Employee emp = employeeRepository.findByUser_UserId(pm.getUser().getUserId()).orElse(null);
            if (emp == null) continue;

            List<Issue> issues = issueRepository.findByProject_ProjectIdAndAssignee_UserId(projectId, pm.getUser().getUserId());

            int completedTasks = 0;
            int overdueTasks = 0;
            int lateTasks = 0;
            int reworks = 0;
            BigDecimal totalEstimated = BigDecimal.ZERO;
            BigDecimal totalActual = BigDecimal.ZERO;

            for (Issue issue : issues) {
                if (issue.isDone()) {
                    completedTasks++;
                    BigDecimal est = issue.getEstimatedHours() != null ? issue.getEstimatedHours() : BigDecimal.ZERO;
                    BigDecimal act = issue.getActualHours() != null ? issue.getActualHours() : BigDecimal.ZERO;

                    // Priority modifier
                    BigDecimal priorityMod = BigDecimal.ONE;
                    if (issue.getPriority() != null) {
                        switch (issue.getPriority()) {
                            case LOW: priorityMod = new BigDecimal("0.8"); break;
                            case MEDIUM: priorityMod = new BigDecimal("1.0"); break;
                            case HIGH: priorityMod = new BigDecimal("1.2"); break;
                            case CRITICAL: priorityMod = new BigDecimal("1.5"); break;
                        }
                    }

                    // Weight modifier (1-10) -> (weight/5.0)
                    BigDecimal weightMod = BigDecimal.ONE;
                    if (issue.getWeight() != null && issue.getWeight() > 0) {
                        weightMod = new BigDecimal(issue.getWeight()).divide(new BigDecimal("5.0"), 2, RoundingMode.HALF_UP);
                    }

                    // Base Volume
                    BigDecimal baseVolume = est.multiply(priorityMod).multiply(weightMod);

                    // Deadline Adherence
                    if (issue.getDueDate() != null && issue.getCompletedAt() != null) {
                        if (issue.getCompletedAt().toLocalDate().isAfter(issue.getDueDate())) {
                            // Late: -20%
                            lateTasks++;
                            baseVolume = baseVolume.multiply(new BigDecimal("0.8"));
                        } else {
                            // Early/On Time: +10%
                            baseVolume = baseVolume.multiply(new BigDecimal("1.1"));
                        }
                    }

                    // Rework Penalty (-5% per rework)
                    if (issue.getReworkCount() != null && issue.getReworkCount() > 0) {
                        reworks += issue.getReworkCount();
                        BigDecimal penalty = new BigDecimal("1.0").subtract(new BigDecimal("0.05").multiply(new BigDecimal(issue.getReworkCount())));
                        if (penalty.compareTo(new BigDecimal("0.1")) < 0) penalty = new BigDecimal("0.1"); // Cap at 90% penalty
                        baseVolume = baseVolume.multiply(penalty);
                    }

                    totalEstimated = totalEstimated.add(baseVolume);
                    totalActual = totalActual.add(act);
                }
                if (issue.isOverdue()) {
                    overdueTasks++;
                }
            }

            if (totalEstimated.compareTo(maxVolume) > 0) {
                maxVolume = totalEstimated;
            }

            MemberStats stats = new MemberStats(pm.getUser().getUserId(), emp, totalEstimated, totalActual, completedTasks, overdueTasks, lateTasks, reworks);
            statsList.add(stats);
        }

        // Calculate scores
        for (MemberStats stats : statsList) {
            PerformanceRankingDTO dto = new PerformanceRankingDTO();
            dto.setEmployeeId(stats.emp.getEmployeeId());
            dto.setUserId(stats.userId);
            dto.setEmployeeName(stats.emp.getFullName());
            if (stats.emp.getUser() != null) {
                dto.setEmployeeAvatar(stats.emp.getUser().getAvatarUrl());
            }

            // 1. Volume Score (0-10)
            BigDecimal volumeScore = stats.totalEstimated.divide(maxVolume, 4, RoundingMode.HALF_UP).multiply(new BigDecimal(10));

            // 2. Speed Score (0-10)
            BigDecimal speedScore = BigDecimal.ZERO;
            if (stats.totalActual.compareTo(BigDecimal.ZERO) > 0) {
                // estimated / actual
                BigDecimal efficiency = stats.totalEstimated.divide(stats.totalActual, 4, RoundingMode.HALF_UP);
                // Assume 1.0 efficiency = 5 points (average). 2.0 efficiency = 10 points.
                // Cap at 10.
                speedScore = efficiency.multiply(new BigDecimal(5));
                if (speedScore.compareTo(new BigDecimal(10)) > 0) {
                    speedScore = new BigDecimal(10);
                }
            } else if (stats.completedTasks > 0) {
                speedScore = new BigDecimal(10); // Logged 0 hours but completed tasks -> extremely fast (or forgot to log)
            }

            dto.setVolumeScore(volumeScore.setScale(1, RoundingMode.HALF_UP));
            dto.setSpeedScore(speedScore.setScale(1, RoundingMode.HALF_UP));

            // System Score = (Volume + Speed) / 2
            BigDecimal systemScore = volumeScore.add(speedScore).divide(new BigDecimal(2), 1, RoundingMode.HALF_UP);
            dto.setSystemScore(systemScore);

            // 3. Quality Score (From Review)
            List<Review> reviews = reviewRepository.findByProjectId(projectId);
            BigDecimal qualityScore = BigDecimal.ZERO;
            long reviewCount = 0;
            for (Review r : reviews) {
                if (r.getEmployee() != null && r.getEmployee().getEmployeeId().equals(stats.emp.getEmployeeId())) {
                    if (r.getTotalScore() != null) {
                        qualityScore = qualityScore.add(r.getTotalScore());
                        reviewCount++;
                    }
                }
            }
            if (reviewCount > 0) {
                qualityScore = qualityScore.divide(new BigDecimal(reviewCount), 1, RoundingMode.HALF_UP);
            }
            dto.setQualityScore(qualityScore);

            // Total Performance = (System + Quality) / 2
            BigDecimal totalScore = systemScore.add(qualityScore).divide(new BigDecimal(2), 1, RoundingMode.HALF_UP);
            dto.setTotalPerformanceScore(totalScore.setScale(1, RoundingMode.HALF_UP));

            dto.setCompletedTasks(stats.completedTasks);
            dto.setTotalStoryPoints(stats.totalEstimated.intValue());
            dto.setOverdueTasks(stats.overdueTasks);
            dto.setLateTasks(stats.lateTasks);
            dto.setReworks(stats.reworks);

            rankings.add(dto);
        }

        // Sort descending by total score
        rankings.sort(Comparator.comparing(PerformanceRankingDTO::getTotalPerformanceScore).reversed());

        return rankings;
    }

    private static class MemberStats {
        Long userId;
        Employee emp;
        BigDecimal totalEstimated;
        BigDecimal totalActual;
        int completedTasks;
        int overdueTasks;
        int lateTasks;
        int reworks;

        public MemberStats(Long userId, Employee emp, BigDecimal totalEstimated, BigDecimal totalActual, int completedTasks, int overdueTasks, int lateTasks, int reworks) {
            this.userId = userId;
            this.emp = emp;
            this.totalEstimated = totalEstimated;
            this.totalActual = totalActual;
            this.completedTasks = completedTasks;
            this.overdueTasks = overdueTasks;
            this.lateTasks = lateTasks;
            this.reworks = reworks;
        }
    }
}
