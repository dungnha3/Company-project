package DoAn.BE.project.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.project.dto.ProjectPhaseDTO;
import DoAn.BE.project.entity.Issue;
import DoAn.BE.project.entity.Project;
import DoAn.BE.project.entity.ProjectPhase;
import DoAn.BE.project.repository.IssueRepository;
import DoAn.BE.project.repository.ProjectPhaseRepository;
import DoAn.BE.project.repository.ProjectRepository;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ProjectPhaseService {

    private final ProjectPhaseRepository projectPhaseRepository;
    private final ProjectRepository projectRepository;
    private final IssueRepository issueRepository;
    private final DoAn.BE.project.repository.ProjectMemberRepository projectMemberRepository;

    private void validateProjectAccess(Long projectId, Long userId) {
        projectMemberRepository.findByProject_ProjectIdAndUser_UserId(projectId, userId)
                .orElseThrow(() -> new DoAn.BE.common.exception.ProjectAccessDeniedException(
                        "Bạn không có quyền truy cập dự án này"));
    }

    private void validateProjectManagement(Long projectId, Long userId) {
        DoAn.BE.project.entity.ProjectMember member = projectMemberRepository
                .findByProject_ProjectIdAndUser_UserId(projectId, userId)
                .orElseThrow(() -> new DoAn.BE.common.exception.ProjectAccessDeniedException(
                        "Bạn không có quyền truy cập dự án này"));
        if (!member.canManageProject()) {
            throw new DoAn.BE.common.exception.ForbiddenException("Bạn không có quyền quản lý dự án này");
        }
    }

    @Transactional(readOnly = true)
    public List<ProjectPhaseDTO.Response> getPhasesByProject(Long projectId, Long userId) {
        validateProjectAccess(projectId, userId);
        return projectPhaseRepository.findByProject_ProjectIdOrderByOrderIndexAsc(projectId).stream()
                .map(ProjectPhaseDTO.Response::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProjectPhaseDTO.Response getPhaseById(Long phaseId, Long userId) {
        ProjectPhase phase = projectPhaseRepository.findById(phaseId)
                .orElseThrow(() -> new ResourceNotFoundException("Project Phase not found"));
        validateProjectAccess(phase.getProject().getProjectId(), userId);
        return ProjectPhaseDTO.Response.fromEntity(phase);
    }

    @Transactional
    public ProjectPhaseDTO.Response createPhase(Long projectId, ProjectPhaseDTO.CreateRequest request, Long userId) {
        validateProjectManagement(projectId, userId);

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        ProjectPhase phase = new ProjectPhase();
        phase.setProject(project);
        phase.setName(request.getName());
        phase.setDescription(request.getDescription());
        phase.setStartDate(request.getStartDate());
        phase.setEndDate(request.getEndDate());
        phase.setOrderIndex(request.getOrderIndex() != null ? request.getOrderIndex() : 0);
        phase.setStatus(ProjectPhase.PhaseStatus.PLANNING);
        phase.setCreatedBy(User.builder().userId(userId).build());

        // Validate dates (simple check)
        if (request.getStartDate() != null && request.getEndDate() != null
                && request.getStartDate().isAfter(request.getEndDate())) {
            throw new IllegalArgumentException("Start date must be before end date");
        }

        ProjectPhase savedPhase = projectPhaseRepository.save(phase);
        return ProjectPhaseDTO.Response.fromEntity(savedPhase);
    }

    @Transactional
    public ProjectPhaseDTO.Response updatePhase(Long phaseId, ProjectPhaseDTO.UpdateRequest request, Long userId) {
        ProjectPhase phase = projectPhaseRepository.findById(phaseId)
                .orElseThrow(() -> new ResourceNotFoundException("Project Phase not found"));

        validateProjectManagement(phase.getProject().getProjectId(), userId);

        if (request.getName() != null)
            phase.setName(request.getName());
        if (request.getDescription() != null)
            phase.setDescription(request.getDescription());
        if (request.getStartDate() != null)
            phase.setStartDate(request.getStartDate());
        if (request.getEndDate() != null)
            phase.setEndDate(request.getEndDate());
        if (request.getStatus() != null)
            phase.setStatus(request.getStatus());
        if (request.getOrderIndex() != null)
            phase.setOrderIndex(request.getOrderIndex());

        // Validate dates again if updated
        if (phase.getStartDate() != null && phase.getEndDate() != null
                && phase.getStartDate().isAfter(phase.getEndDate())) {
            throw new IllegalArgumentException("Start date must be before end date");
        }

        ProjectPhase updatedPhase = projectPhaseRepository.save(phase);
        return ProjectPhaseDTO.Response.fromEntity(updatedPhase);
    }

    @Transactional
    public void deletePhase(Long phaseId, Long userId) {
        ProjectPhase phase = projectPhaseRepository.findById(phaseId)
                .orElseThrow(() -> new ResourceNotFoundException("Project Phase not found"));

        validateProjectManagement(phase.getProject().getProjectId(), userId);

        projectPhaseRepository.deleteById(phaseId);
    }

    // --- Gantt Chart & Automation Logic ---

    @Transactional(readOnly = true)
    public DoAn.BE.project.dto.GanttChartDTO getGanttChartData(Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        List<ProjectPhase> phases = projectPhaseRepository.findByProject_ProjectIdOrderByOrderIndexAsc(projectId);

        return DoAn.BE.project.dto.GanttChartDTO.builder()
                .projectId(project.getProjectId())
                .projectName(project.getName())
                .startDate(project.getStartDate())
                .endDate(project.getEndDate())
                .phases(phases.stream().map(this::mapToGanttPhase).collect(Collectors.toList()))
                .build();
    }

    private DoAn.BE.project.dto.GanttChartDTO.GanttPhaseDTO mapToGanttPhase(ProjectPhase phase) {
        List<Issue> issues = issueRepository.findByPhase_PhaseId(phase.getPhaseId());

        // Automation: Calculate Progress
        int totalIssues = issues.size();
        int completedIssues = 0;
        for (Issue issue : issues) {
            if (issue.getIssueStatus() != null) {
                String status = issue.getIssueStatus().getName().toLowerCase();
                if (status.contains("done") || status.contains("hoàn thành") || status.contains("closed")) {
                    completedIssues++;
                }
            }
        }
        int progress = totalIssues == 0 ? 0 : (int) (((double) completedIssues / totalIssues) * 100);

        List<DoAn.BE.project.dto.GanttChartDTO.GanttTaskDTO> ganttTasks = issues.stream()
                .map(issue -> DoAn.BE.project.dto.GanttChartDTO.GanttTaskDTO.builder()
                        .id(issue.getIssueId())
                        .key(issue.getIssueKey())
                        .name(issue.getTitle())
                        .startDate(issue.getCreatedAt() != null ? issue.getCreatedAt().toLocalDate() : null)
                        .dueDate(issue.getDueDate())
                        .status(issue.getIssueStatus() != null ? issue.getIssueStatus().getName() : "Unknown")
                        .assigneeName(issue.getAssignee() != null ? issue.getAssignee().getFullName() : "Unassigned")
                        .assigneeAvatar(issue.getAssignee() != null ? issue.getAssignee().getAvatarUrl() : null)
                        .build())
                .collect(Collectors.toList());

        return DoAn.BE.project.dto.GanttChartDTO.GanttPhaseDTO.builder()
                .id(phase.getPhaseId())
                .name(phase.getName())
                .startDate(phase.getStartDate())
                .endDate(phase.getEndDate())
                .status(phase.getStatus().name())
                .progress(progress)
                .tasks(ganttTasks)
                .build();
    }
}
