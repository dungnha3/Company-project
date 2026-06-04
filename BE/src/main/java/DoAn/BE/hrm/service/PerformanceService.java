package DoAn.BE.hrm.service;

import DoAn.BE.common.context.TenantContext;
import DoAn.BE.hrm.dto.PerformanceDashboardDTO;
import DoAn.BE.hrm.dto.PerformanceRankingDTO;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.entity.Review;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.hrm.repository.ReviewRepository;
import DoAn.BE.project.entity.Issue;
import DoAn.BE.project.entity.ProjectMember;
import DoAn.BE.project.repository.IssueRepository;
import DoAn.BE.project.repository.ProjectMemberRepository;
import DoAn.BE.timetracking.repository.TimeLogRepository;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PerformanceService {

    private final ProjectMemberRepository projectMemberRepository;
    private final IssueRepository issueRepository;
    private final ReviewRepository reviewRepository;
    private final EmployeeRepository employeeRepository;
    private final TimeLogRepository timeLogRepository;

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
            int totalStoryPoints = 0;
            BigDecimal totalEstimated = BigDecimal.ZERO;
            BigDecimal totalActual = BigDecimal.ZERO;

            for (Issue issue : issues) {
                if (issue.isDone()) {
                    completedTasks++;
                    // Accumulate actual story points (weight field)
                    if (issue.getWeight() != null && issue.getWeight() > 0) {
                        totalStoryPoints += issue.getWeight();
                    }
                    BigDecimal est = BigDecimal.valueOf(8.0); // Baseline task hours (scales with weight and priority below)
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
                            lateTasks++;
                            // No volume penalty here to avoid double penalization (speed score handles late penalty)
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

            MemberStats stats = new MemberStats(pm.getUser().getUserId(), emp, totalEstimated, totalActual, completedTasks, overdueTasks, lateTasks, reworks, totalStoryPoints);
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

            dto.setCompletedTasks(stats.completedTasks);
            dto.setTotalStoryPoints(stats.totalStoryPoints);
            dto.setOverdueTasks(stats.overdueTasks);
            dto.setLateTasks(stats.lateTasks);
            dto.setReworks(stats.reworks);

            if (stats.completedTasks == 0) {
                dto.setVolumeScore(BigDecimal.ZERO.setScale(1));
                dto.setSpeedScore(BigDecimal.ZERO.setScale(1));
                dto.setSystemScore(BigDecimal.ZERO.setScale(1));
                dto.setQualityScore(BigDecimal.ZERO.setScale(1));
                dto.setTotalPerformanceScore(BigDecimal.ZERO.setScale(1));
                rankings.add(dto);
                continue;
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

                // Penalty for late tasks
                if (stats.lateTasks > 0) {
                    double lateRatio = (double) stats.lateTasks / stats.completedTasks;
                    speedScore = speedScore.multiply(new BigDecimal(1.0 - 0.5 * lateRatio));
                }
            } else {
                // Logged 0 hours but completed tasks
                if (stats.lateTasks > 0) {
                    // Penalize based on percentage of late tasks
                    double lateRatio = (double) stats.lateTasks / stats.completedTasks;
                    speedScore = new BigDecimal(10).multiply(new BigDecimal(1.0 - 0.8 * lateRatio));
                } else {
                    speedScore = new BigDecimal(10); // Logged 0 hours, no late tasks -> extremely fast
                }
            }

            dto.setVolumeScore(volumeScore.setScale(1, RoundingMode.HALF_UP));
            dto.setSpeedScore(speedScore.setScale(1, RoundingMode.HALF_UP));

            // System Score = (Volume + Speed) / 2
            BigDecimal systemScore = volumeScore.add(speedScore).divide(new BigDecimal(2), 1, RoundingMode.HALF_UP);
            dto.setSystemScore(systemScore);

            // 3. Quality Score (From approved reviews only)
            List<Review> reviews = reviewRepository.findApprovedByProjectId(projectId);
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
            BigDecimal totalScore;
            if (reviewCount > 0) {
                qualityScore = qualityScore.divide(new BigDecimal(reviewCount), 1, RoundingMode.HALF_UP);
                dto.setQualityScore(qualityScore);
                // Total Performance = (System + Quality) / 2
                totalScore = systemScore.add(qualityScore).divide(new BigDecimal(2), 1, RoundingMode.HALF_UP);
            } else {
                dto.setQualityScore(null);
                // If there are no reviews, total score is based solely on System Score
                totalScore = systemScore;
            }
            dto.setTotalPerformanceScore(totalScore.setScale(1, RoundingMode.HALF_UP));

            rankings.add(dto);
        }

        // Sort descending by total score
        rankings.sort(Comparator.comparing(PerformanceRankingDTO::getTotalPerformanceScore).reversed());

        return rankings;
    }

    /**
     * My stats - returns current user's performance summary
     */
    public PerformanceDashboardDTO.MyStats getMyStats(User currentUser) {
        if (currentUser == null) {
            return PerformanceDashboardDTO.MyStats.builder().build();
        }

        Employee emp = employeeRepository.findByUser_UserId(currentUser.getUserId()).orElse(null);
        if (emp == null) {
            return PerformanceDashboardDTO.MyStats.builder().build();
        }

        // Aggregate across all projects
        List<ProjectMember> allMemberships = projectMemberRepository.findByUser_UserId(currentUser.getUserId());

        int totalCompleted = 0;
        int totalOverdue = 0;
        int totalLate = 0;
        int totalReworks = 0;
        BigDecimal totalSpeed = BigDecimal.ZERO;
        BigDecimal totalQuality = BigDecimal.ZERO;
        BigDecimal totalVolume = BigDecimal.ZERO;
        BigDecimal totalPerfScoreSum = BigDecimal.ZERO;
        int projectCount = 0;
        int reviewedProjectCount = 0;

        for (ProjectMember pm : allMemberships) {
            Long projectId = pm.getProject().getProjectId();
            List<PerformanceRankingDTO> projectRankings = getProjectPerformanceRanking(projectId);
            for (PerformanceRankingDTO r : projectRankings) {
                if (r.getUserId() != null && r.getUserId().equals(currentUser.getUserId())) {
                    totalCompleted += r.getCompletedTasks() != null ? r.getCompletedTasks() : 0;
                    totalOverdue += r.getOverdueTasks() != null ? r.getOverdueTasks() : 0;
                    totalLate += r.getLateTasks() != null ? r.getLateTasks() : 0;
                    totalReworks += r.getReworks() != null ? r.getReworks() : 0;
                    totalSpeed = totalSpeed.add(r.getSpeedScore() != null ? r.getSpeedScore() : BigDecimal.ZERO);
                    totalVolume = totalVolume.add(r.getVolumeScore() != null ? r.getVolumeScore() : BigDecimal.ZERO);
                    if (r.getQualityScore() != null) {
                        totalQuality = totalQuality.add(r.getQualityScore());
                        reviewedProjectCount++;
                    }
                    totalPerfScoreSum = totalPerfScoreSum.add(r.getTotalPerformanceScore() != null ? r.getTotalPerformanceScore() : BigDecimal.ZERO);
                    projectCount++;
                }
            }
        }

        BigDecimal avgSpeed = projectCount > 0 ? totalSpeed.divide(new BigDecimal(projectCount), 1, RoundingMode.HALF_UP) : BigDecimal.ZERO;
        BigDecimal avgQuality = reviewedProjectCount > 0 ? totalQuality.divide(new BigDecimal(reviewedProjectCount), 1, RoundingMode.HALF_UP) : null;
        BigDecimal avgVolume = projectCount > 0 ? totalVolume.divide(new BigDecimal(projectCount), 1, RoundingMode.HALF_UP) : BigDecimal.ZERO;
        BigDecimal totalScore = projectCount > 0 ? totalPerfScoreSum.divide(new BigDecimal(projectCount), 1, RoundingMode.HALF_UP) : BigDecimal.ZERO;

        // Total hours from timelog
        BigDecimal totalHours = timeLogRepository.sumHoursByUser(currentUser.getUserId(), TenantContext.getCompanyId());
        if (totalHours == null) totalHours = BigDecimal.ZERO;

        return PerformanceDashboardDTO.MyStats.builder()
                .totalPerformanceScore(totalScore)
                .performance(totalScore)
                .speedScore(avgSpeed)
                .qualityScore(avgQuality)
                .volumeScore(avgVolume)
                .completedTasks(totalCompleted)
                .overdueTasks(totalOverdue)
                .lateTasks(totalLate)
                .reworks(totalReworks)
                .totalHoursLogged(totalHours)
                .build();
    }

    /**
     * My performance comparison across all projects
     */
    public List<PerformanceRankingDTO> getMyPerformanceComparison(User currentUser) {
        if (currentUser == null) return Collections.emptyList();

        List<PerformanceRankingDTO> allRankings = new ArrayList<>();
        List<ProjectMember> allMemberships = projectMemberRepository.findByUser_UserId(currentUser.getUserId());

        for (ProjectMember pm : allMemberships) {
            List<PerformanceRankingDTO> rankings = getProjectPerformanceRanking(pm.getProject().getProjectId());
            for (PerformanceRankingDTO r : rankings) {
                if (r.getUserId() != null && r.getUserId().equals(currentUser.getUserId())) {
                    allRankings.add(r);
                }
            }
        }
        return allRankings;
    }

    /**
     * Employee performance summary for a specific employee
     */
    public PerformanceDashboardDTO.EmployeeSummary getEmployeePerformanceSummary(Long employeeId) {
        Employee emp = employeeRepository.findById(employeeId).orElse(null);
        if (emp == null || emp.getUser() == null) {
            return PerformanceDashboardDTO.EmployeeSummary.builder().build();
        }

        Long userId = emp.getUser().getUserId();
        List<ProjectMember> memberships = projectMemberRepository.findByUser_UserId(userId);

        int totalCompleted = 0;
        int totalOverdue = 0;
        int totalReworks = 0;
        BigDecimal totalSpeed = BigDecimal.ZERO;
        BigDecimal totalQuality = BigDecimal.ZERO;
        BigDecimal totalVolume = BigDecimal.ZERO;
        BigDecimal totalPerfScoreSum = BigDecimal.ZERO;
        int count = 0;
        int reviewedProjectCount = 0;
        List<String> projectNames = new ArrayList<>();

        for (ProjectMember pm : memberships) {
            List<PerformanceRankingDTO> rankings = getProjectPerformanceRanking(pm.getProject().getProjectId());
            for (PerformanceRankingDTO r : rankings) {
                if (r.getUserId() != null && r.getUserId().equals(userId)) {
                    totalCompleted += r.getCompletedTasks() != null ? r.getCompletedTasks() : 0;
                    totalOverdue += r.getOverdueTasks() != null ? r.getOverdueTasks() : 0;
                    totalReworks += r.getReworks() != null ? r.getReworks() : 0;
                    totalSpeed = totalSpeed.add(r.getSpeedScore() != null ? r.getSpeedScore() : BigDecimal.ZERO);
                    totalVolume = totalVolume.add(r.getVolumeScore() != null ? r.getVolumeScore() : BigDecimal.ZERO);
                    if (r.getQualityScore() != null) {
                        totalQuality = totalQuality.add(r.getQualityScore());
                        reviewedProjectCount++;
                    }
                    totalPerfScoreSum = totalPerfScoreSum.add(r.getTotalPerformanceScore() != null ? r.getTotalPerformanceScore() : BigDecimal.ZERO);
                    count++;
                    if (pm.getProject().getName() != null) {
                        projectNames.add(pm.getProject().getName());
                    }
                }
            }
        }

        BigDecimal avgSpeed = count > 0 ? totalSpeed.divide(new BigDecimal(count), 1, RoundingMode.HALF_UP) : BigDecimal.ZERO;
        BigDecimal avgQuality = reviewedProjectCount > 0 ? totalQuality.divide(new BigDecimal(reviewedProjectCount), 1, RoundingMode.HALF_UP) : null;
        BigDecimal avgVolume = count > 0 ? totalVolume.divide(new BigDecimal(count), 1, RoundingMode.HALF_UP) : BigDecimal.ZERO;
        BigDecimal overall = count > 0 ? totalPerfScoreSum.divide(new BigDecimal(count), 1, RoundingMode.HALF_UP) : BigDecimal.ZERO;

        return PerformanceDashboardDTO.EmployeeSummary.builder()
                .employeeId(emp.getEmployeeId())
                .userId(userId)
                .employeeName(emp.getFullName())
                .employeeAvatar(emp.getUser().getAvatarUrl())
                .overallScore(overall)
                .speedScore(avgSpeed)
                .qualityScore(avgQuality)
                .volumeScore(avgVolume)
                .completedTasks(totalCompleted)
                .overdueTasks(totalOverdue)
                .reworks(totalReworks)
                .projectNames(projectNames)
                .build();
    }

    /**
     * Company-wide performance dashboard
     */
    public PerformanceDashboardDTO getPerformanceDashboard(String period) {
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null) {
            return PerformanceDashboardDTO.builder().build();
        }

        List<Employee> employees = employeeRepository.findByCompanyId(companyId);
        List<PerformanceDashboardDTO.EmployeeSummary> allSummaries = new ArrayList<>();

        for (Employee emp : employees) {
            if (emp.getUser() == null) continue;
            PerformanceDashboardDTO.EmployeeSummary summary = getEmployeePerformanceSummary(emp.getEmployeeId());
            if (summary.getOverallScore() != null && summary.getOverallScore().compareTo(BigDecimal.ZERO) > 0) {
                allSummaries.add(summary);
            }
        }

        // Top 5 performers
        List<PerformanceDashboardDTO.EmployeeSummary> top5 = allSummaries.stream()
                .filter(s -> s.getOverallScore() != null)
                .sorted(Comparator.comparing(PerformanceDashboardDTO.EmployeeSummary::getOverallScore).reversed())
                .limit(5)
                .collect(Collectors.toList());

        // At-risk: score < 6.5
        List<PerformanceDashboardDTO.EmployeeSummary> atRisk = allSummaries.stream()
                .filter(s -> s.getOverallScore() != null && s.getOverallScore().compareTo(new BigDecimal("6.5")) < 0)
                .sorted(Comparator.comparing(PerformanceDashboardDTO.EmployeeSummary::getOverallScore))
                .limit(5)
                .collect(Collectors.toList());

        // Aggregates
        BigDecimal avgPerf = BigDecimal.ZERO, avgSpeed = BigDecimal.ZERO, avgQual = BigDecimal.ZERO, avgVol = BigDecimal.ZERO;
        long totalCompleted = 0, totalOverdue = 0, totalReworks = 0;

        if (!allSummaries.isEmpty()) {
            avgPerf = allSummaries.stream().map(PerformanceDashboardDTO.EmployeeSummary::getOverallScore)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .divide(new BigDecimal(allSummaries.size()), 1, RoundingMode.HALF_UP);
            avgSpeed = allSummaries.stream().map(PerformanceDashboardDTO.EmployeeSummary::getSpeedScore)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .divide(new BigDecimal(allSummaries.size()), 1, RoundingMode.HALF_UP);
            
            List<BigDecimal> nonNullQualities = allSummaries.stream()
                    .map(PerformanceDashboardDTO.EmployeeSummary::getQualityScore)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
            avgQual = !nonNullQualities.isEmpty()
                    ? nonNullQualities.stream().reduce(BigDecimal.ZERO, BigDecimal::add).divide(new BigDecimal(nonNullQualities.size()), 1, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            avgVol = allSummaries.stream().map(PerformanceDashboardDTO.EmployeeSummary::getVolumeScore)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .divide(new BigDecimal(allSummaries.size()), 1, RoundingMode.HALF_UP);
            totalCompleted = allSummaries.stream().mapToLong(s -> s.getCompletedTasks() != null ? s.getCompletedTasks() : 0).sum();
            totalOverdue = allSummaries.stream().mapToLong(s -> s.getOverdueTasks() != null ? s.getOverdueTasks() : 0).sum();
            totalReworks = allSummaries.stream().mapToLong(s -> s.getReworks() != null ? s.getReworks() : 0).sum();
        }

        // Performance by project
        List<PerformanceDashboardDTO.ProjectPerformance> projectPerf = new ArrayList<>();

        return PerformanceDashboardDTO.builder()
                .totalEmployees(employees.size())
                .averagePerformance(avgPerf)
                .averageSpeed(avgSpeed)
                .averageQuality(avgQual)
                .averageVolume(avgVol)
                .totalCompletedTasks(totalCompleted)
                .totalOverdueTasks(totalOverdue)
                .totalReworks(totalReworks)
                .topPerformers(top5)
                .atRiskEmployees(atRisk)
                .performanceByProject(projectPerf)
                .build();
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
        int totalStoryPoints;

        public MemberStats(Long userId, Employee emp, BigDecimal totalEstimated, BigDecimal totalActual, int completedTasks, int overdueTasks, int lateTasks, int reworks, int totalStoryPoints) {
            this.userId = userId;
            this.emp = emp;
            this.totalEstimated = totalEstimated;
            this.totalActual = totalActual;
            this.completedTasks = completedTasks;
            this.overdueTasks = overdueTasks;
            this.lateTasks = lateTasks;
            this.reworks = reworks;
            this.totalStoryPoints = totalStoryPoints;
        }
    }
}
