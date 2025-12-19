package DoAn.BE.project.service;

import DoAn.BE.project.entity.Issue;
import DoAn.BE.project.entity.ProjectMember;
import DoAn.BE.project.repository.IssueRepository;
import DoAn.BE.project.repository.ProjectMemberRepository;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Service tích hợp User với Project
 * - User workload và capacity
 * - User performance metrics
 * - User contributions
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserProjectIntegrationService {
    
    private final IssueRepository issueRepository;
    private final ProjectMemberRepository projectMemberRepository;
    
    /**
     * Lấy workload của user trong project
     */
    @Transactional(readOnly = true)
    public UserProjectWorkload getUserWorkloadInProject(Long projectId, Long userId) {
        // Get all issues assigned to user in project
        List<Issue> assignedIssues = issueRepository.findByProject_ProjectIdAndAssignee_UserId(projectId, userId);
        
        int totalIssues = assignedIssues.size();
        long openIssues = assignedIssues.stream()
            .filter(issue -> !issue.isDone())
            .count();
        long overdueIssues = assignedIssues.stream()
            .filter(Issue::isOverdue)
            .count();
        
        BigDecimal estimatedHours = assignedIssues.stream()
            .filter(issue -> issue.getEstimatedHours() != null && !issue.isDone())
            .map(Issue::getEstimatedHours)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal actualHours = assignedIssues.stream()
            .filter(issue -> issue.getActualHours() != null)
            .map(Issue::getActualHours)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        return new UserProjectWorkload(
            totalIssues,
            (int) openIssues,
            (int) overdueIssues,
            estimatedHours,
            actualHours
        );
    }
    
    /**
     * Lấy tổng workload của user across tất cả projects
     */
    @Transactional(readOnly = true)
    public UserTotalWorkload getUserTotalWorkload(Long userId) {
        // Get all projects user is member of
        List<ProjectMember> memberships = projectMemberRepository.findByUser_UserId(userId);
        
        int totalProjects = memberships.size();
        int totalIssues = 0;
        int openIssues = 0;
        int overdueIssues = 0;
        BigDecimal totalEstimatedHours = BigDecimal.ZERO;
        
        for (ProjectMember membership : memberships) {
            UserProjectWorkload workload = getUserWorkloadInProject(
                membership.getProject().getProjectId(),
                userId
            );
            totalIssues += workload.getTotalIssues();
            openIssues += workload.getOpenIssues();
            overdueIssues += workload.getOverdueIssues();
            totalEstimatedHours = totalEstimatedHours.add(workload.getEstimatedHours());
        }
        
        return new UserTotalWorkload(
            totalProjects,
            totalIssues,
            openIssues,
            overdueIssues,
            totalEstimatedHours
        );
    }
    
    /**
     * Check xem user có overloaded không
     */
    public boolean isUserOverloaded(Long userId) {
        UserTotalWorkload workload = getUserTotalWorkload(userId);
        
        // Threshold: > 10 open issues hoặc > 80 giờ estimated
        return workload.getOpenIssues() > 10 || 
               workload.getTotalEstimatedHours().compareTo(new BigDecimal("80")) > 0;
    }
    
    /**
     * Inner class cho workload trong 1 project
     */
    public static class UserProjectWorkload {
        private final int totalIssues;
        private final int openIssues;
        private final int overdueIssues;
        private final BigDecimal estimatedHours;
        private final BigDecimal actualHours;
        
        public UserProjectWorkload(int totalIssues, int openIssues, int overdueIssues, 
                                   BigDecimal estimatedHours, BigDecimal actualHours) {
            this.totalIssues = totalIssues;
            this.openIssues = openIssues;
            this.overdueIssues = overdueIssues;
            this.estimatedHours = estimatedHours != null ? estimatedHours : BigDecimal.ZERO;
            this.actualHours = actualHours != null ? actualHours : BigDecimal.ZERO;
        }
        
        public int getTotalIssues() { return totalIssues; }
        public int getOpenIssues() { return openIssues; }
        public int getOverdueIssues() { return overdueIssues; }
        public BigDecimal getEstimatedHours() { return estimatedHours; }
        public BigDecimal getActualHours() { return actualHours; }
        public int getCompletedIssues() { return totalIssues - openIssues; }
        
        public double getCompletionRate() {
            return totalIssues > 0 ? ((double) getCompletedIssues() / totalIssues) * 100 : 0;
        }
        
        public String getWorkloadLevel() {
            if (openIssues == 0) return "IDLE";
            if (openIssues <= 3) return "LIGHT";
            if (openIssues <= 7) return "MODERATE";
            if (openIssues <= 10) return "HEAVY";
            return "OVERLOADED";
        }
    }
    
    /**
     * Inner class cho tổng workload
     */
    public static class UserTotalWorkload {
        private final int totalProjects;
        private final int totalIssues;
        private final int openIssues;
        private final int overdueIssues;
        private final BigDecimal totalEstimatedHours;
        
        public UserTotalWorkload(int totalProjects, int totalIssues, int openIssues, 
                                 int overdueIssues, BigDecimal totalEstimatedHours) {
            this.totalProjects = totalProjects;
            this.totalIssues = totalIssues;
            this.openIssues = openIssues;
            this.overdueIssues = overdueIssues;
            this.totalEstimatedHours = totalEstimatedHours != null ? totalEstimatedHours : BigDecimal.ZERO;
        }
        
        public int getTotalProjects() { return totalProjects; }
        public int getTotalIssues() { return totalIssues; }
        public int getOpenIssues() { return openIssues; }
        public int getOverdueIssues() { return overdueIssues; }
        public BigDecimal getTotalEstimatedHours() { return totalEstimatedHours; }
        public int getCompletedIssues() { return totalIssues - openIssues; }
        
        public double getOverallCompletionRate() {
            return totalIssues > 0 ? ((double) getCompletedIssues() / totalIssues) * 100 : 0;
        }
    }
}
