package DoAn.BE.ai.service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import DoAn.BE.ai.dto.ProjectContextDTO;
import DoAn.BE.ai.dto.ProjectContextDTO.*;
import DoAn.BE.project.entity.Issue;
import DoAn.BE.project.entity.Project;
import DoAn.BE.project.entity.ProjectMember;
import DoAn.BE.project.entity.Sprint;
import DoAn.BE.project.repository.IssueRepository;
import DoAn.BE.project.repository.ProjectMemberRepository;
import DoAn.BE.project.repository.ProjectRepository;
import DoAn.BE.project.repository.SprintRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service để thu thập context của project cho AI
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ProjectContextService {
    
    private final ProjectRepository projectRepository;
    private final IssueRepository issueRepository;
    private final SprintRepository sprintRepository;
    private final ProjectMemberRepository projectMemberRepository;
    
    /**
     * Lấy full context của project để cung cấp cho AI
     */
    public ProjectContextDTO getProjectContext(Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found: " + projectId));
        
        List<Issue> issues = issueRepository.findByProject_ProjectId(projectId);
        List<ProjectMember> members = projectMemberRepository.findByProject_ProjectId(projectId);
        List<Sprint> sprints = sprintRepository.findByProject_ProjectId(projectId);
        
        // Build project stats
        ProjectStats stats = buildProjectStats(issues, members, sprints);
        
        // Get current active sprint
        SprintInfo currentSprint = sprints.stream()
                .filter(s -> s.getStatus() == Sprint.SprintStatus.ACTIVE)
                .findFirst()
                .map(s -> buildSprintInfo(s, issues))
                .orElse(null);
        
        // Build member infos
        List<MemberInfo> memberInfos = members.stream()
                .map(m -> buildMemberInfo(m, issues))
                .collect(Collectors.toList());
        
        // Get recent issues (last 10)
        List<IssueInfo> recentIssues = issues.stream()
                .sorted((i1, i2) -> i2.getCreatedAt().compareTo(i1.getCreatedAt()))
                .limit(10)
                .map(this::buildIssueInfo)
                .collect(Collectors.toList());
        
        // Get overdue issues
        List<IssueInfo> overdueIssues = issues.stream()
                .filter(Issue::isOverdue)
                .map(this::buildIssueInfo)
                .collect(Collectors.toList());
        
        return ProjectContextDTO.builder()
                .projectId(project.getProjectId())
                .projectKey(project.getKeyProject())
                .projectName(project.getName())
                .description(project.getDescription())
                .status(project.getStatus().name())
                .startDate(project.getStartDate())
                .endDate(project.getEndDate())
                .createdByName(project.getCreatedBy() != null ? project.getCreatedBy().getUsername() : null)
                .departmentName(project.getPhongBan() != null ? project.getPhongBan().getTenPhongBan() : null)
                .stats(stats)
                .currentSprint(currentSprint)
                .members(memberInfos)
                .recentIssues(recentIssues)
                .overdueIssues(overdueIssues)
                .build();
    }
    
    /**
     * Tạo summary text của project context cho AI prompt
     */
    public String buildContextSummary(ProjectContextDTO context) {
        StringBuilder sb = new StringBuilder();
        
        sb.append("=== THÔNG TIN DỰ ÁN ===\n");
        sb.append(String.format("Tên: %s (%s)\n", context.getProjectName(), context.getProjectKey()));
        sb.append(String.format("Trạng thái: %s\n", context.getStatus()));
        if (context.getDescription() != null) {
            sb.append(String.format("Mô tả: %s\n", context.getDescription()));
        }
        if (context.getStartDate() != null) {
            sb.append(String.format("Ngày bắt đầu: %s\n", context.getStartDate()));
        }
        if (context.getEndDate() != null) {
            sb.append(String.format("Ngày kết thúc dự kiến: %s\n", context.getEndDate()));
        }
        if (context.getDepartmentName() != null) {
            sb.append(String.format("Phòng ban: %s\n", context.getDepartmentName()));
        }
        
        // Stats
        if (context.getStats() != null) {
            ProjectStats stats = context.getStats();
            sb.append("\n=== THỐNG KÊ ===\n");
            sb.append(String.format("Tổng số công việc: %d\n", stats.getTotalIssues()));
            sb.append(String.format("Hoàn thành: %d (%.1f%%)\n", stats.getCompletedIssues(), stats.getCompletionPercentage()));
            sb.append(String.format("Đang làm: %d\n", stats.getInProgressIssues()));
            sb.append(String.format("Chờ xử lý: %d\n", stats.getTodoIssues()));
            sb.append(String.format("Quá hạn: %d\n", stats.getOverdueIssues()));
            sb.append(String.format("Số thành viên: %d\n", stats.getTotalMembers()));
        }
        
        // Current sprint
        if (context.getCurrentSprint() != null) {
            SprintInfo sprint = context.getCurrentSprint();
            sb.append("\n=== SPRINT HIỆN TẠI ===\n");
            sb.append(String.format("Tên: %s\n", sprint.getName()));
            if (sprint.getGoal() != null) {
                sb.append(String.format("Mục tiêu: %s\n", sprint.getGoal()));
            }
            sb.append(String.format("Tiến độ: %d/%d công việc hoàn thành\n", 
                    sprint.getCompletedIssues(), sprint.getTotalIssues()));
            if (sprint.getDaysRemaining() > 0) {
                sb.append(String.format("Còn lại: %d ngày\n", sprint.getDaysRemaining()));
            }
        }
        
        // Team members
        if (context.getMembers() != null && !context.getMembers().isEmpty()) {
            sb.append("\n=== THÀNH VIÊN ===\n");
            for (MemberInfo member : context.getMembers()) {
                sb.append(String.format("- %s (%s): %d việc được giao, %d hoàn thành\n",
                        member.getUsername(), member.getRole(),
                        member.getAssignedIssues(), member.getCompletedIssues()));
            }
        }
        
        // Overdue issues
        if (context.getOverdueIssues() != null && !context.getOverdueIssues().isEmpty()) {
            sb.append("\n=== CÔNG VIỆC QUÁ HẠN ===\n");
            for (IssueInfo issue : context.getOverdueIssues()) {
                sb.append(String.format("- [%s] %s (Hạn: %s, Người thực hiện: %s)\n",
                        issue.getIssueKey(), issue.getTitle(),
                        issue.getDueDate(), 
                        issue.getAssigneeName() != null ? issue.getAssigneeName() : "Chưa giao"));
            }
        }
        
        return sb.toString();
    }
    
    private ProjectStats buildProjectStats(List<Issue> issues, List<ProjectMember> members, List<Sprint> sprints) {
        int total = issues.size();
        int completed = (int) issues.stream().filter(Issue::isDone).count();
        int inProgress = (int) issues.stream()
                .filter(i -> i.getIssueStatus() != null && i.getIssueStatus().isInProgress())
                .count();
        int todo = (int) issues.stream()
                .filter(i -> i.getIssueStatus() != null && i.getIssueStatus().isToDo())
                .count();
        int overdue = (int) issues.stream().filter(Issue::isOverdue).count();
        int activeSprints = (int) sprints.stream()
                .filter(s -> s.getStatus() == Sprint.SprintStatus.ACTIVE)
                .count();
        
        double completionPercentage = total > 0 ? (double) completed / total * 100 : 0;
        
        return ProjectStats.builder()
                .totalIssues(total)
                .completedIssues(completed)
                .inProgressIssues(inProgress)
                .todoIssues(todo)
                .overdueIssues(overdue)
                .completionPercentage(completionPercentage)
                .totalMembers(members.size())
                .totalSprints(sprints.size())
                .activeSprints(activeSprints)
                .build();
    }
    
    private SprintInfo buildSprintInfo(Sprint sprint, List<Issue> allIssues) {
        List<Issue> sprintIssues = allIssues.stream()
                .filter(i -> i.getSprint() != null && i.getSprint().getSprintId().equals(sprint.getSprintId()))
                .collect(Collectors.toList());
        
        int completed = (int) sprintIssues.stream().filter(Issue::isDone).count();
        int daysRemaining = sprint.getEndDate() != null 
                ? (int) ChronoUnit.DAYS.between(LocalDate.now(), sprint.getEndDate())
                : 0;
        
        return SprintInfo.builder()
                .sprintId(sprint.getSprintId())
                .name(sprint.getName())
                .goal(sprint.getGoal())
                .startDate(sprint.getStartDate())
                .endDate(sprint.getEndDate())
                .status(sprint.getStatus().name())
                .totalIssues(sprintIssues.size())
                .completedIssues(completed)
                .daysRemaining(Math.max(0, daysRemaining))
                .build();
    }
    
    private MemberInfo buildMemberInfo(ProjectMember member, List<Issue> allIssues) {
        Long userId = member.getUser().getUserId();
        int assigned = (int) allIssues.stream()
                .filter(i -> i.getAssignee() != null && i.getAssignee().getUserId().equals(userId))
                .count();
        int completed = (int) allIssues.stream()
                .filter(i -> i.getAssignee() != null && i.getAssignee().getUserId().equals(userId) && i.isDone())
                .count();
        
        return MemberInfo.builder()
                .userId(userId)
                .username(member.getUser().getUsername())
                .role(member.getRole().name())
                .assignedIssues(assigned)
                .completedIssues(completed)
                .build();
    }
    
    private IssueInfo buildIssueInfo(Issue issue) {
        return IssueInfo.builder()
                .issueId(issue.getIssueId())
                .issueKey(issue.getIssueKey())
                .title(issue.getTitle())
                .status(issue.getIssueStatus() != null ? issue.getIssueStatus().getName() : "Unknown")
                .priority(issue.getPriority().name())
                .assigneeName(issue.getAssignee() != null ? issue.getAssignee().getUsername() : null)
                .dueDate(issue.getDueDate())
                .overdue(issue.isOverdue())
                .build();
    }
}
