package DoAn.BE.project.service;

import DoAn.BE.project.entity.Issue;
import DoAn.BE.project.entity.ProjectMember;
import DoAn.BE.project.repository.IssueRepository;
import DoAn.BE.project.repository.ProjectMemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

// [Service tích hợp User với Project] (Role: System/Internal)
@Service
@RequiredArgsConstructor
@Slf4j
public class UserProjectIntegrationService {

    private final IssueRepository issueRepository;
    private final ProjectMemberRepository projectMemberRepository;

    // [Giới hạn số issue mở cho mức overload] (Role: Config)
    private static final int MAX_OPEN_ISSUES_THRESHOLD = 10;
    private static final BigDecimal MAX_ESTIMATED_HOURS_THRESHOLD = new BigDecimal("80");

    // [Lấy workload của user trong project] (Role: Internal)
    @Transactional(readOnly = true)
    public UserProjectWorkload getUserWorkloadInProject(Long projectId, Long userId) {
        // [Validate input] (Role: Guard)
        if (projectId == null || userId == null) {
            log.warn("projectId hoặc userId không được null");
            return new UserProjectWorkload(0, 0, 0, BigDecimal.ZERO, BigDecimal.ZERO);
        }

        // [Lấy tất cả issue được giao cho user trong project] (Role: Query)
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
                actualHours);
    }

    // [Lấy tổng workload của user trên tất cả projects] (Role: Internal)
    @Transactional(readOnly = true)
    public UserTotalWorkload getUserTotalWorkload(Long userId) {
        // [Validate input] (Role: Guard)
        if (userId == null) {
            log.warn("userId không được null");
            return new UserTotalWorkload(0, 0, 0, 0, BigDecimal.ZERO);
        }

        // [Lấy tất cả projects user là thành viên] (Role: Query)
        List<ProjectMember> memberships = projectMemberRepository.findByUser_UserId(userId);

        int totalProjects = memberships.size();
        int totalIssues = 0;
        int openIssues = 0;
        int overdueIssues = 0;
        BigDecimal totalEstimatedHours = BigDecimal.ZERO;

        // [Tính tổng workload từ tất cả projects] (Role: Calculation)
        for (ProjectMember membership : memberships) {
            UserProjectWorkload workload = getUserWorkloadInProject(
                    membership.getProject().getProjectId(),
                    userId);
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
                totalEstimatedHours);
    }

    // [Kiểm tra user có bị quá tải không] (Role: Business Rule)
    public boolean isUserOverloaded(Long userId) {
        if (userId == null) {
            return false;
        }
        UserTotalWorkload workload = getUserTotalWorkload(userId);
        return workload.getOpenIssues() > MAX_OPEN_ISSUES_THRESHOLD ||
                workload.getTotalEstimatedHours().compareTo(MAX_ESTIMATED_HOURS_THRESHOLD) > 0;
    }

    // [DTO workload trong 1 project] (Role: Data Transfer)
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

        public int getTotalIssues() {
            return totalIssues;
        }

        public int getOpenIssues() {
            return openIssues;
        }

        public int getOverdueIssues() {
            return overdueIssues;
        }

        public BigDecimal getEstimatedHours() {
            return estimatedHours;
        }

        public BigDecimal getActualHours() {
            return actualHours;
        }

        public int getCompletedIssues() {
            return totalIssues - openIssues;
        }

        public double getCompletionRate() {
            return totalIssues > 0 ? ((double) getCompletedIssues() / totalIssues) * 100 : 0;
        }

        public String getWorkloadLevel() {
            if (openIssues == 0)
                return "IDLE";
            if (openIssues <= 3)
                return "LIGHT";
            if (openIssues <= 7)
                return "MODERATE";
            if (openIssues <= 10)
                return "HEAVY";
            return "OVERLOADED";
        }
    }

    // [DTO tổng workload của user] (Role: Data Transfer)
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

        public int getTotalProjects() {
            return totalProjects;
        }

        public int getTotalIssues() {
            return totalIssues;
        }

        public int getOpenIssues() {
            return openIssues;
        }

        public int getOverdueIssues() {
            return overdueIssues;
        }

        public BigDecimal getTotalEstimatedHours() {
            return totalEstimatedHours;
        }

        public int getCompletedIssues() {
            return totalIssues - openIssues;
        }

        public double getOverallCompletionRate() {
            return totalIssues > 0 ? ((double) getCompletedIssues() / totalIssues) * 100 : 0;
        }
    }
}
