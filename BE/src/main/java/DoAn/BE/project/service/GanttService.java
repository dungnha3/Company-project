package DoAn.BE.project.service;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.common.exception.ProjectAccessDeniedException;
import DoAn.BE.project.dto.GanttDto;
import DoAn.BE.project.entity.*;
import DoAn.BE.project.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

// Service for Gantt chart operations
// /
@Service
@RequiredArgsConstructor
@Slf4j
public class GanttService {

    private final ProjectRepository projectRepository;
    private final ProjectPhaseRepository phaseRepository;
    private final IssueRepository issueRepository;
    private final IssueDependencyRepository dependencyRepository;
    private final ProjectMemberRepository memberRepository;

    // Get complete Gantt chart data for a project
    // /
    @Transactional(readOnly = true)
    public GanttDto.GanttResponse getGanttData(Long projectId, Long userId) {
        validateProjectAccess(projectId, userId);

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        List<ProjectPhase> phases = phaseRepository.findByProject_ProjectIdOrderByOrderIndexAsc(projectId);
        List<Issue> issues = issueRepository.findByProject_ProjectId(projectId);
        List<IssueDependency> dependencies = dependencyRepository.findByProjectId(projectId);

        // Build Gantt items
        List<GanttDto.GanttItem> items = new ArrayList<>();

        // Add phases
        for (ProjectPhase phase : phases) {
            items.add(buildPhaseItem(phase));
        }

        // Add issues
        for (Issue issue : issues) {
            items.add(buildIssueItem(issue));
        }

        // Build dependency links
        List<GanttDto.DependencyLink> dependencyLinks = dependencies.stream()
                .map(this::buildDependencyLink)
                .collect(Collectors.toList());

        // Calculate stats
        GanttDto.GanttStats stats = calculateStats(phases, issues);

        return GanttDto.GanttResponse.builder()
                .projectId(projectId)
                .projectName(project.getName())
                .projectStartDate(project.getStartDate())
                .projectEndDate(project.getEndDate())
                .items(items)
                .dependencies(dependencyLinks)
                .stats(stats)
                .build();
    }

    // Update issue dates (drag-drop in Gantt)
    // /
    @Transactional
    public GanttDto.GanttItem updateIssueDates(Long issueId, GanttDto.DateUpdateRequest request, Long userId) {
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new ResourceNotFoundException("Issue not found"));

        validateProjectAccess(issue.getProject().getProjectId(), userId);

        // Validate dates
        if (request.getEndDate().isBefore(request.getStartDate())) {
            throw new BadRequestException("End date cannot be before start date");
        }

        LocalDate oldDueDate = issue.getDueDate();

        // Update dates
        issue.setStartDate(request.getStartDate());
        issue.setDueDate(request.getEndDate());
        issue = issueRepository.save(issue);

        // Optionally move successors
        if (Boolean.TRUE.equals(request.getMoveSuccessors()) && oldDueDate != null) {
            long daysDiff = ChronoUnit.DAYS.between(oldDueDate, request.getEndDate());
            if (daysDiff != 0) {
                moveSuccessors(issueId, (int) daysDiff);
            }
        }

        log.info("Updated dates for issue {} to {}-{}", issueId, request.getStartDate(), request.getEndDate());
        return buildIssueItem(issue);
    }

    // Move successor issues by specified days
    // /
    private void moveSuccessors(Long issueId, int daysDiff) {
        moveSuccessorsRecursive(issueId, daysDiff, new HashSet<>());
    }

    private void moveSuccessorsRecursive(Long issueId, int daysDiff, Set<Long> visited) {
        if (!visited.add(issueId))
            return;

        List<IssueDependency> dependencies = dependencyRepository.findByPredecessor_IssueId(issueId);

        for (IssueDependency dep : dependencies) {
            Issue successor = dep.getSuccessor();

            // Only update and recurse if we haven't visited this successor yet
            if (!visited.contains(successor.getIssueId())) {
                if (successor.getStartDate() != null) {
                    successor.setStartDate(successor.getStartDate().plusDays(daysDiff));
                }
                if (successor.getDueDate() != null) {
                    successor.setDueDate(successor.getDueDate().plusDays(daysDiff));
                }
                issueRepository.save(successor);

                // Recursively move successors of successors
                moveSuccessorsRecursive(successor.getIssueId(), daysDiff, visited);
            }
        }
    }

    // Create dependency between issues
    // /
    @Transactional
    public GanttDto.DependencyResponse createDependency(GanttDto.CreateDependencyRequest request, Long userId) {
        Issue predecessor = issueRepository.findById(request.getPredecessorId())
                .orElseThrow(() -> new ResourceNotFoundException("Predecessor issue not found"));
        Issue successor = issueRepository.findById(request.getSuccessorId())
                .orElseThrow(() -> new ResourceNotFoundException("Successor issue not found"));

        // Validate same project
        if (!predecessor.getProject().getProjectId().equals(successor.getProject().getProjectId())) {
            throw new BadRequestException("Issues must be in the same project");
        }

        validateProjectAccess(predecessor.getProject().getProjectId(), userId);

        // Check for existing dependency
        if (dependencyRepository.existsByPredecessor_IssueIdAndSuccessor_IssueId(
                request.getPredecessorId(), request.getSuccessorId())) {
            throw new BadRequestException("Dependency already exists");
        }

        // Check for circular dependencies
        if (wouldCreateCycle(request.getPredecessorId(), request.getSuccessorId())) {
            throw new BadRequestException("This dependency would create a circular reference");
        }

        // Create dependency
        IssueDependency dependency = IssueDependency.builder()
                .predecessor(predecessor)
                .successor(successor)
                .dependencyType(request.getDependencyType())
                .lagDays(request.getLagDays())
                .build();

        dependency = dependencyRepository.save(dependency);
        log.info("Created dependency: {} -> {}", request.getPredecessorId(), request.getSuccessorId());

        return buildDependencyResponse(dependency);
    }

    // Delete dependency
    // /
    @Transactional
    public void deleteDependency(Long dependencyId, Long userId) {
        IssueDependency dependency = dependencyRepository.findById(dependencyId)
                .orElseThrow(() -> new ResourceNotFoundException("Dependency not found"));

        validateProjectAccess(dependency.getPredecessor().getProject().getProjectId(), userId);

        dependencyRepository.delete(dependency);
        log.info("Deleted dependency {}", dependencyId);
    }

    // Get dependencies for an issue
    // /
    @Transactional(readOnly = true)
    public List<GanttDto.DependencyResponse> getIssueDependencies(Long issueId, Long userId) {
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new ResourceNotFoundException("Issue not found"));

        validateProjectAccess(issue.getProject().getProjectId(), userId);

        List<IssueDependency> dependencies = dependencyRepository.findAllByIssueId(issueId);
        return dependencies.stream()
                .map(this::buildDependencyResponse)
                .collect(Collectors.toList());
    }

    // Check if adding dependency would create a cycle
    // /
    private boolean wouldCreateCycle(Long predecessorId, Long successorId) {
        // DFS to find if successor can reach predecessor
        Set<Long> visited = new HashSet<>();
        return canReach(successorId, predecessorId, visited);
    }

    private boolean canReach(Long fromId, Long toId, Set<Long> visited) {
        if (fromId.equals(toId)) {
            return true;
        }
        if (visited.contains(fromId)) {
            return false;
        }
        visited.add(fromId);

        List<IssueDependency> dependencies = dependencyRepository.findByPredecessor_IssueId(fromId);
        for (IssueDependency dep : dependencies) {
            if (canReach(dep.getSuccessor().getIssueId(), toId, visited)) {
                return true;
            }
        }
        return false;
    }

    private GanttDto.GanttItem buildPhaseItem(ProjectPhase phase) {
        // Calculate progress from phase issues
        List<Issue> phaseIssues = issueRepository.findByPhase_PhaseId(phase.getPhaseId());
        int progress = calculateProgress(phaseIssues);

        return GanttDto.GanttItem.builder()
                .id(phase.getPhaseId())
                .type("phase")
                .key(phase.getName())
                .title(phase.getName())
                .startDate(phase.getStartDate())
                .endDate(phase.getEndDate())
                .progress(progress)
                .status(phase.getStatus() != null ? phase.getStatus().name() : null)
                .color(null) // Phase color can be added later
                .isExpanded(true)
                .dependencies(new ArrayList<>())
                .build();
    }

    private GanttDto.GanttItem buildIssueItem(Issue issue) {
        // Calculate progress from status
        int progress = 0;
        if (issue.getIssueStatus() != null) {
            String statusName = issue.getIssueStatus().getName().toLowerCase();
            if (statusName.contains("done") || statusName.contains("closed") || statusName.contains("hoàn thành")) {
                progress = 100;
            } else if (statusName.contains("progress") || statusName.contains("đang")) {
                progress = 50;
            } else if (statusName.contains("review") || statusName.contains("testing")) {
                progress = 75;
            }
        }

        // Get predecessor IDs
        List<Long> predecessorIds = dependencyRepository.findBySuccessor_IssueId(issue.getIssueId())
                .stream()
                .map(dep -> dep.getPredecessor().getIssueId())
                .collect(Collectors.toList());

        return GanttDto.GanttItem.builder()
                .id(issue.getIssueId())
                .type("issue")
                .key(issue.getIssueKey())
                .title(issue.getTitle())
                .startDate(issue.getStartDate())
                .endDate(issue.getDueDate())
                .progress(progress)
                .priority(issue.getPriority())
                .status(issue.getIssueStatus() != null ? issue.getIssueStatus().getName() : null)
                .statusColor(issue.getIssueStatus() != null ? issue.getIssueStatus().getColor() : null)
                .assigneeId(issue.getAssignee() != null ? issue.getAssignee().getUserId() : null)
                .assigneeName(issue.getAssignee() != null ? issue.getAssignee().getUsername() : null)
                .parentId(issue.getPhase() != null ? issue.getPhase().getPhaseId() : null)
                .dependencies(predecessorIds)
                .isExpanded(false)
                .build();
    }

    private GanttDto.DependencyLink buildDependencyLink(IssueDependency dep) {
        return GanttDto.DependencyLink.builder()
                .dependencyId(dep.getDependencyId())
                .predecessorId(dep.getPredecessor().getIssueId())
                .successorId(dep.getSuccessor().getIssueId())
                .type(dep.getDependencyType())
                .lagDays(dep.getLagDays())
                .build();
    }

    private GanttDto.DependencyResponse buildDependencyResponse(IssueDependency dep) {
        return GanttDto.DependencyResponse.builder()
                .dependencyId(dep.getDependencyId())
                .predecessorId(dep.getPredecessor().getIssueId())
                .predecessorKey(dep.getPredecessor().getIssueKey())
                .predecessorTitle(dep.getPredecessor().getTitle())
                .successorId(dep.getSuccessor().getIssueId())
                .successorKey(dep.getSuccessor().getIssueKey())
                .successorTitle(dep.getSuccessor().getTitle())
                .dependencyType(dep.getDependencyType())
                .lagDays(dep.getLagDays())
                .createdAt(dep.getCreatedAt())
                .build();
    }

    private int calculateProgress(List<Issue> issues) {
        if (issues.isEmpty())
            return 0;

        long completed = issues.stream()
                .filter(i -> i.getIssueStatus() != null &&
                        (i.getIssueStatus().getName().toLowerCase().contains("done") ||
                                i.getIssueStatus().getName().toLowerCase().contains("closed")))
                .count();

        return (int) (completed * 100 / issues.size());
    }

    private GanttDto.GanttStats calculateStats(List<ProjectPhase> phases, List<Issue> issues) {
        int totalPhases = phases.size();
        int totalIssues = issues.size();

        long completedIssues = issues.stream()
                .filter(i -> i.getIssueStatus() != null &&
                        i.getIssueStatus().getName().toLowerCase().contains("done"))
                .count();

        long overdueIssues = issues.stream()
                .filter(Issue::isOverdue)
                .count();

        double overallProgress = totalIssues > 0 ? (completedIssues * 100.0 / totalIssues) : 0;

        return GanttDto.GanttStats.builder()
                .totalItems(totalPhases + totalIssues)
                .totalPhases(totalPhases)
                .totalIssues(totalIssues)
                .completedItems((int) completedIssues)
                .overdueitems((int) overdueIssues)
                .overallProgress(overallProgress)
                .build();
    }

    private void validateProjectAccess(Long projectId, Long userId) {
        memberRepository.findByProject_ProjectIdAndUser_UserId(projectId, userId)
                .orElseThrow(() -> new ProjectAccessDeniedException("You don't have access to this project"));
    }
}
