package DoAn.BE.analytics.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import DoAn.BE.analytics.dto.*;
import DoAn.BE.project.entity.Issue;
import DoAn.BE.project.entity.ProjectMember;
import DoAn.BE.project.entity.Sprint;
import DoAn.BE.project.repository.IssueRepository;
import DoAn.BE.project.repository.ProjectMemberRepository;
import DoAn.BE.project.repository.SprintRepository;
import DoAn.BE.timetracking.repository.TimeLogRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectAnalyticsService {

        private final IssueRepository issueRepository;
        private final SprintRepository sprintRepository;
        private final TimeLogRepository timeLogRepository;
        private final ProjectMemberRepository projectMemberRepository;

        // Get burndown chart data for a sprint
        // Shows remaining work over time
        // /
        public BurndownDataDTO getBurndownData(Long projectId, Long sprintId) {
                Sprint sprint = sprintRepository.findById(sprintId).orElse(null);
                if (sprint == null) {
                        return BurndownDataDTO.builder()
                                        .sprintName("N/A")
                                        .dataPoints(new ArrayList<>())
                                        .build();
                }
                if (sprint.getProject() == null || !sprint.getProject().getProjectId().equals(projectId)) {
                        throw new DoAn.BE.common.exception.BadRequestException("Sprint không thuộc dự án này");
                }

                List<Issue> sprintIssues = issueRepository.findBySprint_SprintId(sprintId);
                int totalIssues = sprintIssues.size();

                // Calculate ideal burndown line
                LocalDate startDate = sprint.getStartDate();
                LocalDate endDate = sprint.getEndDate();

                if (startDate == null || endDate == null) {
                        return BurndownDataDTO.builder()
                                        .sprintName(sprint.getName())
                                        .totalIssues(totalIssues)
                                        .dataPoints(new ArrayList<>())
                                        .build();
                }

                long totalDays = java.time.temporal.ChronoUnit.DAYS.between(startDate, endDate) + 1;
                List<BurndownPointDTO> dataPoints = new ArrayList<>();

                // Count completed issues
                long completedCount = sprintIssues.stream()
                                .filter(Issue::isDone)
                                .count();
                int remaining = totalIssues - (int) completedCount;

                // Calculate ideal burn rate per day
                double idealBurnRate = (double) totalIssues / totalDays;

                // Simplified: just show start and current state
                dataPoints.add(BurndownPointDTO.builder()
                                .date(startDate)
                                .ideal(totalIssues)
                                .actual(totalIssues)
                                .build());

                // Add current state point
                LocalDate today = LocalDate.now();
                long daysElapsed = java.time.temporal.ChronoUnit.DAYS.between(startDate, today);
                int idealRemaining = Math.max(0, (int) (totalIssues - (daysElapsed * idealBurnRate)));

                dataPoints.add(BurndownPointDTO.builder()
                                .date(today.isBefore(endDate) ? today : endDate)
                                .ideal(idealRemaining)
                                .actual(remaining)
                                .build());

                return BurndownDataDTO.builder()
                                .sprintId(sprintId)
                                .sprintName(sprint.getName())
                                .startDate(startDate)
                                .endDate(endDate)
                                .totalIssues(totalIssues)
                                .completedIssues((int) completedCount)
                                .dataPoints(dataPoints)
                                .build();
        }

        // Get velocity data - issues completed per sprint
        // /
        public VelocityDataDTO getVelocityData(Long projectId, int sprintCount) {
                List<Sprint> sprints = sprintRepository.findByProjectIdOrderByCreatedAtDesc(projectId);

                List<VelocityPointDTO> points = sprints.stream()
                                .limit(sprintCount)
                                .map(sprint -> {
                                        long completed = issueRepository.findBySprint_SprintId(sprint.getSprintId())
                                                        .stream()
                                                        .filter(Issue::isDone)
                                                        .count();

                                        return VelocityPointDTO.builder()
                                                        .sprintId(sprint.getSprintId())
                                                        .sprintName(sprint.getName())
                                                        .completedIssues((int) completed)
                                                        .build();
                                })
                                .collect(Collectors.toList());

                // Reverse to show chronological order
                java.util.Collections.reverse(points);

                double avgVelocity = points.stream()
                                .mapToInt(VelocityPointDTO::getCompletedIssues)
                                .average()
                                .orElse(0.0);

                return VelocityDataDTO.builder()
                                .projectId(projectId)
                                .sprints(points)
                                .averageVelocity(avgVelocity)
                                .build();
        }

        // Get issue status distribution (for pie chart)
        // /
        public StatusDistributionDTO getStatusDistribution(Long projectId) {
                List<Issue> issues = issueRepository.findByProject_ProjectId(projectId);

                Map<String, Integer> distribution = new HashMap<>();
                for (Issue issue : issues) {
                        String statusName = issue.getIssueStatus() != null
                                        ? issue.getIssueStatus().getName()
                                        : "Unknown";
                        distribution.merge(statusName, 1, (a, b) -> a + b);
                }

                List<StatusCountDTO> statusCounts = distribution.entrySet().stream()
                                .map(e -> StatusCountDTO.builder()
                                                .status(e.getKey())
                                                .count(e.getValue())
                                                .build())
                                .collect(Collectors.toList());

                return StatusDistributionDTO.builder()
                                .projectId(projectId)
                                .totalIssues(issues.size())
                                .distribution(statusCounts)
                                .build();
        }

        // Get team workload - per member breakdown
        // /
        public TeamWorkloadDTO getTeamWorkload(Long projectId) {
                BigDecimal totalHours = timeLogRepository.sumHoursByProject(projectId);

                List<ProjectMember> members = projectMemberRepository.findByProject_ProjectId(projectId);
                List<TeamWorkloadDTO.MemberWorkload> memberWorkloads = new ArrayList<>();

                for (ProjectMember member : members) {
                        if (member.getUser() == null) continue;
                        Long uid = member.getUser().getUserId();

                        long total = issueRepository.countByProject_ProjectIdAndAssignee_UserId(projectId, uid);
                        long completed = issueRepository.countCompletedByProjectAndAssignee(projectId, uid);
                        long inProgress = issueRepository.countByProject_ProjectIdAndAssignee_UserId(projectId, uid)
                                - completed
                                - issueRepository.countByProject_ProjectIdAndAssignee_UserId(projectId, uid);
                        // Count in-progress: issues assigned but not done (avoid N+1, compute via stream)
                        List<Issue> memberIssues = issueRepository.findByProject_ProjectIdAndAssignee_UserId(projectId, uid);
                        long inProg = memberIssues.stream().filter(i -> !i.isDone()).count();
                        long unassigned = issueRepository.countByProject_ProjectIdAndAssignee_IsNull(projectId);
                        BigDecimal hours = timeLogRepository.sumHoursByUserAndProject(uid, projectId);

                        memberWorkloads.add(TeamWorkloadDTO.MemberWorkload.builder()
                                .userId(uid)
                                .userName(member.getUser().getFullName())
                                .avatarUrl(member.getUser().getAvatarUrl())
                                .totalIssues(total)
                                .completedIssues(completed)
                                .inProgressIssues(inProg)
                                .unassignedIssues(unassigned)
                                .loggedHours(hours != null ? hours.doubleValue() : 0.0)
                                .build());
                }

                // Also add unassigned total once
                long totalUnassigned = issueRepository.countByProject_ProjectIdAndAssignee_IsNull(projectId);

                return TeamWorkloadDTO.builder()
                                .projectId(projectId)
                                .totalLoggedHours(totalHours != null ? totalHours : BigDecimal.ZERO)
                                .members(memberWorkloads)
                                .build();
        }
}
