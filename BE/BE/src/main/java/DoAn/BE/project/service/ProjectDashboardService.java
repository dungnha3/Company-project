package DoAn.BE.project.service;

import DoAn.BE.common.exception.*;
import DoAn.BE.common.util.PermissionUtil;
import DoAn.BE.project.dto.*;
import DoAn.BE.project.entity.*;
import DoAn.BE.project.entity.Issue.Priority;
import DoAn.BE.project.entity.Sprint.SprintStatus;
import DoAn.BE.project.repository.*;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectDashboardService {
    
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final IssueRepository issueRepository;
    private final SprintRepository sprintRepository;
    private final IssueActivityRepository issueActivityRepository;
    private final IssueCommentRepository issueCommentRepository;
    
    @Transactional(readOnly = true)
    public ProjectStatsDTO getProjectStats(Long projectId, User currentUser) {
        // Kiểm tra quyền truy cập project
        if (!PermissionUtil.canAccessProjects(currentUser)) {
            throw new ForbiddenException("Bạn không có quyền truy cập dự án");
        }
        
        validateProjectAccess(projectId, currentUser.getUserId());
        
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy dự án"));
        
        log.info("Generating stats for project {} by user {}", projectId, currentUser.getUsername());
        
        ProjectStatsDTO stats = new ProjectStatsDTO();
        
        // Basic project info
        stats.setProjectId(project.getProjectId());
        stats.setProjectName(project.getName());
        stats.setProjectKey(project.getKeyProject());
        stats.setStartDate(project.getStartDate());
        stats.setEndDate(project.getEndDate());
        stats.setStatus(project.getStatus().toString());
        
        // Get all issues for this project
        List<Issue> allIssues = issueRepository.findByProject_ProjectId(projectId);
        stats.setTotalIssues(allIssues.size());
        
        // Issue statistics by status
        Map<String, Integer> statusDistribution = new HashMap<>();
        int completedIssues = 0;
        int inProgressIssues = 0;
        int todoIssues = 0;
        int overdueIssues = 0;
        
        for (Issue issue : allIssues) {
            if (issue.getIssueStatus() != null && issue.getIssueStatus().getName() != null) {
                String statusName = issue.getIssueStatus().getName();
                statusDistribution.put(statusName, statusDistribution.getOrDefault(statusName, 0) + 1);
            
                if (issue.isDone()) {
                    completedIssues++;
                } else if ("In Progress".equals(statusName)) {
                    inProgressIssues++;
                } else if ("To Do".equals(statusName)) {
                    todoIssues++;
                }
            }
            
            if (issue.isOverdue()) {
                overdueIssues++;
            }
        }
        
        stats.setCompletedIssues(completedIssues);
        stats.setInProgressIssues(inProgressIssues);
        stats.setTodoIssues(todoIssues);
        stats.setOverdueIssues(overdueIssues);
        stats.setStatusDistribution(statusDistribution);
        
        // Completion rate
        double completionRate = allIssues.isEmpty() ? 0.0 : (double) completedIssues / allIssues.size() * 100;
        stats.setCompletionRate(Math.round(completionRate * 100.0) / 100.0);
        
        // Priority distribution
        Map<String, Integer> priorityDistribution = new HashMap<>();
        for (Issue issue : allIssues) {
            String priority = issue.getPriority().toString();
            priorityDistribution.put(priority, priorityDistribution.getOrDefault(priority, 0) + 1);
        }
        stats.setPriorityDistribution(priorityDistribution);
        
        // Sprint statistics
        List<Sprint> allSprints = sprintRepository.findByProject_ProjectId(projectId);
        stats.setTotalSprints(allSprints.size());
        stats.setActiveSprints((int) allSprints.stream().filter(s -> s.getStatus() == SprintStatus.ACTIVE).count());
        stats.setCompletedSprints((int) allSprints.stream().filter(s -> s.getStatus() == SprintStatus.COMPLETED).count());
        
        // Team statistics
        List<ProjectMember> members = projectMemberRepository.findByProject_ProjectId(projectId);
        stats.setTotalMembers(members.size());
        
        Map<String, Integer> memberWorkload = new HashMap<>();
        for (ProjectMember member : members) {
            if (member.getUser() != null) {
                List<Issue> memberIssues = allIssues.stream()
                    .filter(issue -> issue.getAssignee() != null && 
                            issue.getAssignee().getUserId().equals(member.getUser().getUserId()))
                    .collect(Collectors.toList());
                memberWorkload.put(member.getUser().getUsername(), memberIssues.size());
            }
        }
        stats.setMemberWorkload(memberWorkload);
        
        // Recent activity (last 7 days)
        LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
        List<IssueActivity> recentActivities = issueActivityRepository.findByProjectIdOrderByCreatedAtDesc(projectId)
            .stream()
            .filter(activity -> activity.getCreatedAt().isAfter(sevenDaysAgo))
            .collect(Collectors.toList());
        stats.setRecentActivityCount(recentActivities.size());
        
        List<IssueComment> recentComments = issueCommentRepository.findByProjectIdOrderByCreatedAtDesc(projectId)
            .stream()
            .filter(comment -> comment.getCreatedAt().isAfter(sevenDaysAgo))
            .collect(Collectors.toList());
        stats.setRecentCommentCount(recentComments.size());
        
        return stats;
    }
    
    @Transactional(readOnly = true)
    public SprintBurndownDTO getSprintBurndown(Long sprintId, User currentUser) {
        if (!PermissionUtil.canAccessProjects(currentUser)) {
            throw new ForbiddenException("Bạn không có quyền truy cập dự án");
        }
        
        Sprint sprint = sprintRepository.findById(sprintId)
            .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy sprint"));
        
        if (sprint.getProject() == null) {
            throw new IllegalStateException("Sprint không có dự án liên kết");
        }
        
        validateProjectAccess(sprint.getProject().getProjectId(), currentUser.getUserId());
        
        List<Issue> sprintIssues = issueRepository.findBySprint_SprintId(sprintId);
        
        SprintBurndownDTO burndown = new SprintBurndownDTO();
        burndown.setSprintId(sprint.getSprintId());
        burndown.setSprintName(sprint.getName());
        burndown.setStartDate(sprint.getStartDate());
        burndown.setEndDate(sprint.getEndDate());
        burndown.setTotalIssues(sprintIssues.size());
        
        // Generate burndown data
        List<SprintBurndownDTO.BurndownPoint> burndownData = new ArrayList<>();
        
        if (sprint.getStartDate() != null && sprint.getEndDate() != null) {
            LocalDate currentDate = sprint.getStartDate();
            LocalDate endDate = sprint.getEndDate().isBefore(LocalDate.now()) ? sprint.getEndDate() : LocalDate.now();
            
            int totalIssues = sprintIssues.size();
            long totalDays = sprint.getStartDate().until(sprint.getEndDate()).getDays();
            
            while (!currentDate.isAfter(endDate)) {
                // Count completed issues up to this date
                int completedIssues = 0;
                for (Issue issue : sprintIssues) {
                    if (issue.isDone()) {
                        // Check if issue was completed by this date (simplified - using current state)
                        completedIssues++;
                    }
                }
                
                int remainingIssues = totalIssues - completedIssues;
                
                // Calculate ideal remaining (linear burndown)
                long daysFromStart = sprint.getStartDate().until(currentDate).getDays();
                int idealRemaining = totalDays > 0 ? 
                    (int) (totalIssues - (totalIssues * daysFromStart / totalDays)) : 0;
                
                SprintBurndownDTO.BurndownPoint point = new SprintBurndownDTO.BurndownPoint();
                point.setDate(currentDate);
                point.setRemainingIssues(remainingIssues);
                point.setIdealRemaining(Math.max(0, idealRemaining));
                point.setCompletedIssues(completedIssues);
                
                burndownData.add(point);
                currentDate = currentDate.plusDays(1);
            }
        }
        
        burndown.setBurndownData(burndownData);
        return burndown;
    }
    
    @Transactional(readOnly = true)
    public List<ProjectStatsDTO> getUserProjectsStats(User currentUser) {
        if (!PermissionUtil.canAccessProjects(currentUser)) {
            throw new ForbiddenException("Bạn không có quyền truy cập dự án");
        }
        
        List<ProjectMember> memberships = projectMemberRepository.findByUser_UserId(currentUser.getUserId());
        
        return memberships.stream()
            .filter(member -> member.getProject() != null)
            .map(member -> getProjectStats(member.getProject().getProjectId(), currentUser))
            .collect(Collectors.toList());
    }
    
    // Helper methods
    private void validateProjectAccess(Long projectId, Long userId) {
        projectMemberRepository.findByProject_ProjectIdAndUser_UserId(projectId, userId)
            .orElseThrow(() -> new ProjectAccessDeniedException("Bạn không có quyền truy cập dự án này"));
    }
}
