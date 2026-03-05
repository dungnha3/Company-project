package DoAn.BE.project.service;

import DoAn.BE.common.exception.*;
import DoAn.BE.project.dto.CreateIssueRequest;
import DoAn.BE.project.dto.IssueDTO;
import DoAn.BE.project.dto.UpdateIssueRequest;
import DoAn.BE.project.entity.Issue;
import DoAn.BE.project.entity.IssueStatus;
import DoAn.BE.project.entity.IssueActivity;
import DoAn.BE.project.entity.IssueActivity.ActivityType;
import DoAn.BE.project.entity.Project;
import DoAn.BE.project.entity.ProjectMember;
import DoAn.BE.project.entity.Sprint;
import DoAn.BE.project.repository.IssueRepository;
import DoAn.BE.project.repository.IssueStatusRepository;
import DoAn.BE.project.repository.IssueActivityRepository;
import DoAn.BE.project.repository.ProjectMemberRepository;
import DoAn.BE.project.repository.SprintRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
@lombok.extern.slf4j.Slf4j
public class IssueService {

    private final IssueRepository issueRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final IssueStatusRepository issueStatusRepository;
    private final UserRepository userRepository;
    private final SprintRepository sprintRepository;
    private final IssueActivityRepository issueActivityRepository;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;
    private final DoAn.BE.project.repository.ProjectPhaseRepository projectPhaseRepository;
    private final jakarta.persistence.EntityManager entityManager;

    @Transactional
    public IssueDTO createIssue(CreateIssueRequest request, Long userId) {
        User reporter = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        // Fix race condition in issue key generation by applying a PESSIMISTIC_WRITE
        // lock on Project
        Project project = entityManager.find(Project.class, request.getProjectId(),
                jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        if (project == null) {
            throw new ResourceNotFoundException("Không tìm thấy dự án");
        }

        validateProjectAccess(request.getProjectId(), userId);

        // Nếu không có statusId, mặc định là To Do (id: 1)
        Integer statusId = request.getStatusId() != null ? request.getStatusId() : 1;
        IssueStatus status = issueStatusRepository.findById(statusId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy trạng thái"));
        User assignee = null;
        if (request.getAssigneeId() != null) {
            assignee = userRepository.findById(request.getAssigneeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người được giao việc"));
            validateProjectAccess(request.getProjectId(), request.getAssigneeId());
        }
        String issueKey = generateIssueKey(project);

        // Create issue
        Issue issue = new Issue();
        issue.setProject(project);
        issue.setIssueKey(issueKey);
        issue.setTitle(request.getTitle());
        issue.setDescription(request.getDescription());
        issue.setIssueStatus(status);
        issue.setPriority(request.getPriority() != null ? request.getPriority() : Issue.Priority.MEDIUM);
        issue.setReporter(reporter);
        issue.setAssignee(assignee);
        issue.setEstimatedHours(request.getEstimatedHours());
        issue.setStartDate(request.getStartDate());
        issue.setDueDate(request.getDueDate());
        issue.setWeight(request.getWeight());
        issue.setIsImportant(request.getIsImportant() != null ? request.getIsImportant() : false);
        issue.setIsUrgent(request.getIsUrgent() != null ? request.getIsUrgent() : false);

        if (request.getSprintId() != null) {
            Sprint sprint = sprintRepository.findById(request.getSprintId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sprint"));
            if (sprint.getProject() == null || !sprint.getProject().getProjectId().equals(project.getProjectId())) {
                throw new BadRequestException("Sprint không thuộc dự án này");
            }
            // Zombie Sprint Check
            if (sprint.isCompleted()) {
                throw new BadRequestException("Không thể tạo issue trong Sprint đã kết thúc");
            }
            issue.setSprint(sprint);
        }

        issue = issueRepository.save(issue);

        // Log activity for issue creation
        IssueActivity createdActivity = new IssueActivity(issue, reporter, ActivityType.CREATED,
                reporter.getUsername() + " đã tạo issue '" + issue.getTitle() + "'");
        issueActivityRepository.save(createdActivity);

        publishIssueEvent(DoAn.BE.project.event.IssueEvent.EventType.CREATED, issue, userId);

        return convertToDTO(issue);
    }

    @Transactional(readOnly = true)
    public IssueDTO getIssueById(Long issueId, Long userId) {
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy issue"));

        if (issue.getProject() == null) {
            throw new IllegalStateException("Issue không có dự án liên kết");
        }

        validateProjectAccess(issue.getProject().getProjectId(), userId);

        return convertToDTO(issue);
    }

    @Transactional(readOnly = true)
    public List<IssueDTO> getProjectIssues(Long projectId, Long userId) {
        // Validate access
        validateProjectAccess(projectId, userId);

        List<Issue> issues = issueRepository.findByProject_ProjectId(projectId);
        return issues.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<IssueDTO> getProjectIssuesPaginated(Long projectId, Long userId, Pageable pageable) {
        // Validate access
        validateProjectAccess(projectId, userId);
        Page<Issue> issues = issueRepository.findByProject_ProjectId(projectId, pageable);
        return issues.map(this::convertToDTO);
    }

    @Transactional(readOnly = true)
    public List<IssueDTO> getProjectBacklog(Long projectId, Long userId) {
        // Validate access
        validateProjectAccess(projectId, userId);

        List<Issue> issues = issueRepository.findByProject_ProjectIdAndSprintIsNull(projectId);
        return issues.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<IssueDTO> getProjectBacklogPaginated(Long projectId, Long userId, Pageable pageable) {
        // Validate access
        validateProjectAccess(projectId, userId);
        Page<Issue> issues = issueRepository.findByProject_ProjectIdAndSprintIsNull(projectId, pageable);
        return issues.map(this::convertToDTO);
    }

    @Transactional(readOnly = true)
    public List<IssueDTO> getSprintIssues(Long sprintId, Long userId) {
        Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sprint"));

        if (sprint.getProject() == null) {
            throw new IllegalStateException("Sprint không có dự án liên kết");
        }

        validateProjectAccess(sprint.getProject().getProjectId(), userId);

        List<Issue> issues = issueRepository.findBySprint_SprintId(sprintId);
        return issues.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<IssueDTO> getSprintIssuesPaginated(Long sprintId, Long userId, Pageable pageable) {
        Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sprint"));

        if (sprint.getProject() == null) {
            throw new IllegalStateException("Sprint không có dự án liên kết");
        }

        validateProjectAccess(sprint.getProject().getProjectId(), userId);
        Page<Issue> issues = issueRepository.findBySprint_SprintId(sprintId, pageable);
        return issues.map(this::convertToDTO);
    }

    @Transactional(readOnly = true)
    public List<IssueDTO> getMyIssues(Long userId) {
        List<Issue> assignedIssues = issueRepository.findByAssignee_UserId(userId);
        return assignedIssues.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<IssueDTO> getMyIssuesPaginated(Long userId, Pageable pageable) {
        Page<Issue> assignedIssues = issueRepository.findByAssignee_UserId(userId, pageable);
        return assignedIssues.map(this::convertToDTO);
    }

    @Transactional(readOnly = true)
    public List<IssueDTO> getMyReportedIssues(Long userId) {
        List<Issue> reportedIssues = issueRepository.findByReporter_UserId(userId);
        return reportedIssues.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<IssueDTO> getMyReportedIssuesPaginated(Long userId, Pageable pageable) {
        Page<Issue> reportedIssues = issueRepository.findByReporter_UserId(userId, pageable);
        return reportedIssues.map(this::convertToDTO);
    }

    @Transactional
    public IssueDTO updateIssue(Long issueId, UpdateIssueRequest request, Long userId) {
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy issue"));

        if (issue.getProject() == null) {
            throw new IllegalStateException("Issue không có dự án liên kết");
        }

        validateProjectAccess(issue.getProject().getProjectId(), userId);

        User actor = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        // Track old values for activity logging
        String oldTitle = issue.getTitle();
        String oldPriority = issue.getPriority() != null ? issue.getPriority().name() : null;
        String oldAssigneeName = issue.getAssignee() != null ? issue.getAssignee().getUsername() : null;
        String oldDueDate = issue.getDueDate() != null ? issue.getDueDate().toString() : null;
        String oldStatusName = issue.getIssueStatus() != null ? issue.getIssueStatus().getName() : null;

        // Update fields if provided
        if (request.getTitle() != null) {
            issue.setTitle(request.getTitle());
        }
        if (request.getDescription() != null) {
            issue.setDescription(request.getDescription());
        }
        if (request.getStatusId() != null) {
            IssueStatus status = issueStatusRepository.findById(request.getStatusId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy trạng thái"));
            issue.setIssueStatus(status);
        }
        if (request.getPriority() != null) {
            issue.setPriority(request.getPriority());
        }
        if (request.getAssigneeId() != null) {
            User assignee = userRepository.findById(request.getAssigneeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người được giao việc"));
            validateProjectAccess(issue.getProject().getProjectId(), request.getAssigneeId());
            issue.setAssignee(assignee);
        }
        if (request.getEstimatedHours() != null) {
            issue.setEstimatedHours(request.getEstimatedHours());
        }
        if (request.getActualHours() != null) {
            issue.setActualHours(request.getActualHours());
        }
        if (request.getDueDate() != null) {
            issue.setDueDate(request.getDueDate());
        }
        if (request.getStartDate() != null) {
            issue.setStartDate(request.getStartDate());
        }
        if (request.getWeight() != null) {
            issue.setWeight(request.getWeight());
        }
        if (request.getIsImportant() != null) {
            issue.setIsImportant(request.getIsImportant());
        }
        if (request.getIsUrgent() != null) {
            issue.setIsUrgent(request.getIsUrgent());
        }

        issue = issueRepository.save(issue);

        // Log activity for meaningful field changes
        if (request.getTitle() != null && !request.getTitle().equals(oldTitle)) {
            issueActivityRepository.save(new IssueActivity(issue, actor, ActivityType.TITLE_CHANGED,
                    "Title", oldTitle, request.getTitle()));
        }
        if (request.getPriority() != null && !request.getPriority().name().equals(oldPriority)) {
            issueActivityRepository.save(new IssueActivity(issue, actor, ActivityType.PRIORITY_CHANGED,
                    "Priority", oldPriority, request.getPriority().name()));
        }
        if (request.getAssigneeId() != null) {
            String newAssigneeName = issue.getAssignee() != null ? issue.getAssignee().getUsername() : null;
            if (newAssigneeName != null && !newAssigneeName.equals(oldAssigneeName)) {
                issueActivityRepository.save(new IssueActivity(issue, actor, ActivityType.ASSIGNEE_CHANGED,
                        "Assignee", oldAssigneeName, newAssigneeName));
            }
        }
        if (request.getStatusId() != null) {
            String newStatusName = issue.getIssueStatus() != null ? issue.getIssueStatus().getName() : null;
            if (newStatusName != null && !newStatusName.equals(oldStatusName)) {
                issueActivityRepository.save(new IssueActivity(issue, actor, ActivityType.STATUS_CHANGED,
                        "Status", oldStatusName, newStatusName));
            }
        }
        if (request.getDueDate() != null) {
            String newDueDate = request.getDueDate().toString();
            if (!newDueDate.equals(oldDueDate)) {
                issueActivityRepository.save(new IssueActivity(issue, actor, ActivityType.DUE_DATE_CHANGED,
                        "DueDate", oldDueDate, newDueDate));
            }
        }

        publishIssueEvent(DoAn.BE.project.event.IssueEvent.EventType.UPDATED, issue, userId);

        return convertToDTO(issue);
    }

    @Transactional
    public void deleteIssue(Long issueId, Long userId) {
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy issue"));

        // Check if user can manage the project or is the reporter
        Long projectId = issue.getProject().getProjectId();
        ProjectMember member = projectMemberRepository.findByProject_ProjectIdAndUser_UserId(projectId, userId)
                .orElseThrow(() -> new ProjectAccessDeniedException("Bạn không có quyền truy cập dự án này"));

        // Only managers/owners or the reporter can delete
        if (!member.canManageProject() && !issue.getReporter().getUserId().equals(userId)) {
            throw new ForbiddenException("Bạn không có quyền xóa issue này");
        }

        publishIssueEvent(DoAn.BE.project.event.IssueEvent.EventType.DELETED, issue, userId);

        issueRepository.delete(issue);
    }

    @Transactional
    public IssueDTO assignIssue(Long issueId, Long assigneeId, Long userId) {
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy issue"));

        if (issue.getProject() == null) {
            throw new IllegalStateException("Issue không có dự án liên kết");
        }

        validateProjectManagement(issue.getProject().getProjectId(), userId);

        User actor = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        String oldAssigneeName = issue.getAssignee() != null ? issue.getAssignee().getUsername() : null;

        User assignee = userRepository.findById(assigneeId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người được giao việc"));
        validateProjectAccess(issue.getProject().getProjectId(), assigneeId);

        issue.assignTo(assignee);
        issue = issueRepository.save(issue);

        // Log activity for assignment change
        issueActivityRepository.save(new IssueActivity(issue, actor, ActivityType.ASSIGNEE_CHANGED,
                "Assignee", oldAssigneeName, assignee.getUsername()));

        publishIssueEvent(DoAn.BE.project.event.IssueEvent.EventType.ASSIGNED, issue, userId);

        return convertToDTO(issue);
    }

    @Transactional
    public IssueDTO changeIssueStatus(Long issueId, Integer statusId, Long userId) {
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy issue"));

        if (issue.getProject() == null) {
            throw new IllegalStateException("Issue không có dự án liên kết");
        }

        validateProjectAccess(issue.getProject().getProjectId(), userId);

        // Validate status
        IssueStatus status = issueStatusRepository.findById(statusId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy trạng thái"));

        // Get user for activity log
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        // Save old status for activity log
        String oldStatus = issue.getIssueStatus() != null ? issue.getIssueStatus().getName() : "";
        String newStatus = status.getName();

        // Change status
        issue.changeStatus(status);
        issue = issueRepository.save(issue);

        // Create activity log for status change
        if (!oldStatus.equals(newStatus)) {
            IssueActivity activity = new IssueActivity(
                    issue,
                    user,
                    ActivityType.STATUS_CHANGED,
                    "Status",
                    oldStatus,
                    newStatus);
            activity.setDescription(
                    user.getUsername() + " đã chuyển '" + issue.getTitle() + "' từ " + oldStatus + " → " + newStatus);
            issueActivityRepository.save(activity);
        }

        updatePhaseStatusIfNeeded(issue);

        publishIssueEvent(DoAn.BE.project.event.IssueEvent.EventType.STATUS_CHANGED, issue, userId);

        return convertToDTO(issue);
    }

    private void updatePhaseStatusIfNeeded(Issue issue) {
        if (issue.getPhase() == null) {
            return;
        }

        DoAn.BE.project.entity.ProjectPhase phase = issue.getPhase();
        java.util.List<Issue> phaseIssues = issueRepository.findByPhase_PhaseId(phase.getPhaseId());

        if (phaseIssues.isEmpty()) {
            return;
        }

        boolean allDone = true;
        boolean anyInProgress = false;

        for (Issue i : phaseIssues) {
            if (i.getIssueStatus() != null) {
                if (!i.isDone()) {
                    allDone = false;
                }
                String statusName = i.getIssueStatus().getName().toLowerCase();
                if (statusName.contains("progress") || statusName.contains("đang thực hiện")) {
                    anyInProgress = true;
                }
            } else {
                allDone = false;
            }
        }
        if (allDone && phase.getStatus() != DoAn.BE.project.entity.ProjectPhase.PhaseStatus.COMPLETED) {
            phase.setStatus(DoAn.BE.project.entity.ProjectPhase.PhaseStatus.COMPLETED);
            projectPhaseRepository.save(phase);
        } else if (anyInProgress && phase.getStatus() == DoAn.BE.project.entity.ProjectPhase.PhaseStatus.PLANNING) {
            phase.setStatus(DoAn.BE.project.entity.ProjectPhase.PhaseStatus.IN_PROGRESS);
            projectPhaseRepository.save(phase);
        }
    }

    private void validateProjectAccess(Long projectId, Long userId) {
        projectMemberRepository.findByProject_ProjectIdAndUser_UserId(projectId, userId)
                .orElseThrow(() -> new ProjectAccessDeniedException("Bạn không có quyền truy cập dự án này"));
    }

    private void validateProjectManagement(Long projectId, Long userId) {
        ProjectMember member = projectMemberRepository.findByProject_ProjectIdAndUser_UserId(projectId, userId)
                .orElseThrow(() -> new ProjectAccessDeniedException("Bạn không có quyền truy cập dự án này"));

        if (!member.canManageProject()) {
            throw new ForbiddenException("Bạn không có quyền quản lý dự án này");
        }
    }

    private String generateIssueKey(Project project) {
        Long maxNumber = issueRepository.findMaxIssueNumberByProjectId(project.getProjectId());
        long nextNumber = (maxNumber != null ? maxNumber : 0) + 1;
        String key = String.format("%s-%d", project.getKeyProject(), nextNumber);

        // Safety check: If key already exists (edge case), increment
        while (issueRepository.findByIssueKey(key).isPresent()) {
            nextNumber++;
            key = String.format("%s-%d", project.getKeyProject(), nextNumber);
        }
        return key;
    }

    private IssueDTO convertToDTO(Issue issue) {
        IssueDTO dto = new IssueDTO();
        dto.setIssueId(issue.getIssueId());

        if (issue.getProject() != null) {
            dto.setProjectId(issue.getProject().getProjectId());
            dto.setProjectName(issue.getProject().getName());
        }

        if (issue.getSprint() != null) {
            dto.setSprintId(issue.getSprint().getSprintId());
            dto.setSprintName(issue.getSprint().getName());
        }

        dto.setIssueKey(issue.getIssueKey());
        dto.setTitle(issue.getTitle());
        dto.setDescription(issue.getDescription());

        if (issue.getIssueStatus() != null) {
            dto.setStatusId(issue.getIssueStatus().getStatusId());
            dto.setStatusName(issue.getIssueStatus().getName());
            dto.setStatusColor(issue.getIssueStatus().getColor());
        }

        dto.setPriority(issue.getPriority());

        if (issue.getReporter() != null) {
            dto.setReporterId(issue.getReporter().getUserId());
            dto.setReporterName(issue.getReporter().getUsername());
        }

        if (issue.getAssignee() != null) {
            dto.setAssigneeId(issue.getAssignee().getUserId());
            dto.setAssigneeName(issue.getAssignee().getUsername());
        }

        dto.setEstimatedHours(issue.getEstimatedHours());
        dto.setActualHours(issue.getActualHours());
        dto.setStartDate(issue.getStartDate());
        dto.setDueDate(issue.getDueDate());
        dto.setWeight(issue.getWeight());
        dto.setIsImportant(issue.getIsImportant());
        dto.setIsUrgent(issue.getIsUrgent());
        dto.setEisenhowerQuadrant(issue.getEisenhowerQuadrant());
        dto.setCompletedAt(issue.getCompletedAt());
        dto.setCreatedAt(issue.getCreatedAt());
        dto.setUpdatedAt(issue.getUpdatedAt());
        dto.setIsOverdue(issue.isOverdue());

        return dto;
    }

    // Dispatch webhook event for issue changes
    // /
    // Publish async event for issue changes
    // /
    private void publishIssueEvent(DoAn.BE.project.event.IssueEvent.EventType eventType, Issue issue, Long actorId) {
        try {
            eventPublisher.publishEvent(new DoAn.BE.project.event.IssueEvent(this, issue, eventType, actorId));
        } catch (Exception e) {
            log.warn("Failed to publish issue event {}: {}", eventType, e.getMessage());
        }
    }

    // [Global Ghost Cleanup] Khi User bị xóa khỏi hệ thống => Unassign tất cả
    // issues của user này
    @org.springframework.context.event.EventListener
    @org.springframework.scheduling.annotation.Async
    public void handleUserDeletedGlobally(DoAn.BE.common.event.UserDeletedEvent event) {
        if (event.getUser() != null) {
            log.warn("User {} deleted globally. Unassigning all issues.", event.getUser().getUsername());
            issueRepository.unassignByGlobalUser(event.getUser().getUserId());
        }
    }
}
