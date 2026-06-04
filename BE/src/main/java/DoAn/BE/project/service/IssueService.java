package DoAn.BE.project.service;

import DoAn.BE.common.context.TenantContext;
import DoAn.BE.common.exception.*;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.company.entity.CompanyMember;
import DoAn.BE.company.entity.CompanyRole;
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
import DoAn.BE.project.event.IssueUpdatedEvent;
import DoAn.BE.project.repository.IssueRepository;
import DoAn.BE.project.repository.IssueStatusRepository;
import DoAn.BE.project.repository.IssueActivityRepository;
import DoAn.BE.project.repository.ProjectMemberRepository;
import DoAn.BE.project.repository.SprintRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import DoAn.BE.hrm.repository.LeaveRequestRepository;
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
    private final LeaveRequestRepository leaveRequestRepository;
    private final jakarta.persistence.EntityManager entityManager;
    private final AccessControlService accessControlService;

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
            
            // Check leave status
            validateAssigneeLeaveStatus(assignee.getUserId(), request.getStartDate(), request.getDueDate());
        }
        String issueKey = generateIssueKey(project);

        // Create issue
        Issue issue = new Issue();
        issue.setProject(project);
        issue.setIssueKey(issueKey);
        issue.setTitle(request.getTitle());
        issue.setDescription(request.getDescription());
        issue.changeStatus(status);
        issue.setPriority(request.getPriority() != null ? request.getPriority() : Issue.Priority.MEDIUM);
        issue.setIssueType(request.getIssueType() != null ? request.getIssueType() : Issue.IssueType.TASK);
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

        // Set parent issue for subtasks
        if (request.getParentIssueId() != null) {
            Issue parentIssue = issueRepository.findById(request.getParentIssueId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy issue cha"));
            if (!parentIssue.getProject().getProjectId().equals(project.getProjectId())) {
                throw new BadRequestException("Issue cha không thuộc cùng dự án");
            }
            issue.setParentIssue(parentIssue);
        }

        issue = issueRepository.save(issue);

        // Log activity for issue creation
        IssueActivity createdActivity = new IssueActivity(issue, reporter, ActivityType.CREATED,
                reporter.getUsername() + " đã tạo issue '" + issue.getTitle() + "'");
        issueActivityRepository.save(createdActivity);

        // Only send notifications for parent issues (not subtasks auto-created by AI)
        if (issue.getParentIssue() == null) {
            publishIssueEvent(DoAn.BE.project.event.IssueEvent.EventType.CREATED, issue, userId);

            // Notify the assignee by email when an issue is created with one already set
            if (issue.getAssignee() != null) {
                publishIssueEvent(DoAn.BE.project.event.IssueEvent.EventType.ASSIGNED, issue, userId);
            }
        }

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

        IssueDTO dto = convertToDTO(issue);

        // Populate subtasks for parent issues
        List<Issue> subtasks = issueRepository.findByParentIssue_IssueId(issueId);
        dto.setSubtasks(subtasks.stream().map(this::convertToDTO).collect(Collectors.toList()));

        return dto;
    }

    @Transactional(readOnly = true)
    public List<IssueDTO> getProjectIssues(Long projectId, Long userId) {
        // Validate access
        validateProjectAccess(projectId, userId);

        List<Issue> issues = issueRepository.findByProject_ProjectIdAndParentIssueIsNull(projectId);
        return issues.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<IssueDTO> getProjectIssuesPaginated(Long projectId, Long userId, Pageable pageable) {
        validateProjectAccess(projectId, userId);
        Page<Issue> issues = issueRepository.findByProject_ProjectIdAndParentIssueIsNull(projectId, pageable);
        return issues.map(this::convertToDTO);
    }

    /**
     * Chỉ trả về issues thuộc sprint ACTIVE của dự án.
     * Dùng cho Kanban board — không bao gồm Backlog (sprintId == null)
     * hay Sprint PLANNING.
     */
    @Transactional(readOnly = true)
    public Page<IssueDTO> getActiveSprintIssues(Long projectId, Long userId, Pageable pageable) {
        validateProjectAccess(projectId, userId);
        Page<Issue> issues = issueRepository.findBoardIssuesByProjectId(projectId, pageable);
        return issues.map(this::convertToDTO);
    }

    /**
     * Trả về tất cả issues không thuộc sprint ACTIVE.
     * Gồm: Backlog (sprintId == null) + Sprint PLANNING.
     * Dùng cho Backlog panel trên Kanban board.
     */
    @Transactional(readOnly = true)
    public Page<IssueDTO> getBacklogIssuesIncludingPlanning(Long projectId, Long userId, Pageable pageable) {
        validateProjectAccess(projectId, userId);
        Page<Issue> issues = issueRepository.findBacklogIssuesByProjectId(projectId, pageable);
        return issues.map(this::convertToDTO);
    }

    @Transactional(readOnly = true)
    public List<IssueDTO> getProjectBacklog(Long projectId, Long userId) {
        // Validate access
        validateProjectAccess(projectId, userId);

        List<Issue> issues = issueRepository.findByProject_ProjectIdAndSprintIsNullAndParentIssueIsNull(projectId);
        return issues.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<IssueDTO> getProjectBacklogPaginated(Long projectId, Long userId, Pageable pageable) {
        // Validate access
        validateProjectAccess(projectId, userId);
        Page<Issue> issues = issueRepository.findByProject_ProjectIdAndSprintIsNullAndParentIssueIsNull(projectId, pageable);
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

        List<Issue> issues = issueRepository.findBySprint_SprintIdAndParentIssueIsNull(sprintId);
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
        Page<Issue> issues = issueRepository.findBySprint_SprintIdAndParentIssueIsNull(sprintId, pageable);
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
        Long oldAssigneeId = issue.getAssignee() != null ? issue.getAssignee().getUserId() : null;
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
            applyStatusTransition(issue, status, actor);
        }
        if (request.getPriority() != null) {
            issue.setPriority(request.getPriority());
        }
        if (request.getIssueType() != null) {
            issue.setIssueType(request.getIssueType());
        }
        if (request.getAssigneeId() != null) {
            User assignee = userRepository.findById(request.getAssigneeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người được giao việc"));
            validateProjectAccess(issue.getProject().getProjectId(), request.getAssigneeId());
            
            // Check leave status if assignee is changed or dates are changed
            if (!request.getAssigneeId().equals(issue.getAssignee() != null ? issue.getAssignee().getUserId() : null) || request.getStartDate() != null || request.getDueDate() != null) {
                java.time.LocalDate checkStart = request.getStartDate() != null ? request.getStartDate() : issue.getStartDate();
                java.time.LocalDate checkEnd = request.getDueDate() != null ? request.getDueDate() : issue.getDueDate();
                validateAssigneeLeaveStatus(assignee.getUserId(), checkStart, checkEnd);
            }
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

        // Only send notifications for parent issues (subtasks are updated as part of parent workflow)
        if (issue.getParentIssue() == null) {
            publishIssueEvent(DoAn.BE.project.event.IssueEvent.EventType.UPDATED, issue, userId);

            // Publish ASSIGNED event only when assignee is genuinely changed
            boolean assigneeChanged = request.getAssigneeId() != null
                    && !request.getAssigneeId().equals(oldAssigneeId);
            if (assigneeChanged) {
                publishIssueEvent(DoAn.BE.project.event.IssueEvent.EventType.ASSIGNED, issue, userId);
            }

            // Notify Assignee + Reporter about the general update
            // (skip if only the assignee changed — the ASSIGNED handler already covers that)
            if (!assigneeChanged) {
                publishIssueUpdatedEvent(issue, actor, "Cập nhật công việc", null);
            }
        }

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

        // Only send notifications for parent issues
        if (issue.getParentIssue() == null) {
            publishIssueEvent(DoAn.BE.project.event.IssueEvent.EventType.DELETED, issue, userId);
        }

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

        if (assigneeId == null) {
            issue.assignTo(null);
            issue = issueRepository.save(issue);

            issueActivityRepository.save(new IssueActivity(issue, actor, ActivityType.ASSIGNEE_CHANGED,
                    "Assignee", oldAssigneeName, null));

            return convertToDTO(issue);
        }

        User assignee = userRepository.findById(assigneeId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người được giao việc"));
        validateProjectAccess(issue.getProject().getProjectId(), assigneeId);

        validateAssigneeLeaveStatus(assignee.getUserId(), issue.getStartDate(), issue.getDueDate());

        issue.assignTo(assignee);
        issue = issueRepository.save(issue);

        // Log activity for assignment change
        issueActivityRepository.save(new IssueActivity(issue, actor, ActivityType.ASSIGNEE_CHANGED,
                "Assignee", oldAssigneeName, assignee.getUsername()));

        // Only send notifications for parent issues (subtasks are updated as part of parent workflow)
        if (issue.getParentIssue() == null) {
            publishIssueEvent(DoAn.BE.project.event.IssueEvent.EventType.ASSIGNED, issue, userId);
        }

        return convertToDTO(issue);
    }

    @Transactional
    public IssueDTO changeIssueStatus(Long issueId, Integer statusId, Integer orderIndex, Long userId) {
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy issue"));

        if (issue.getProject() == null) {
            throw new IllegalStateException("Issue không có dự án liên kết");
        }

        validateProjectAccess(issue.getProject().getProjectId(), userId);

        IssueStatus status = issueStatusRepository.findById(statusId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy trạng thái"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        applyStatusTransition(issue, status, user);
        if (orderIndex != null) {
            issue.setOrderIndex(orderIndex);
        }
        issue = issueRepository.save(issue);

        return convertToDTO(issue);
    }

    @Transactional
    public Issue completeIssueFromQuickReview(Issue issue, IssueStatus doneStatus, User actor) {
        applyStatusTransition(issue, doneStatus, actor);
        return issueRepository.save(issue);
    }

    private void applyStatusTransition(Issue issue, IssueStatus newStatus, User actor) {
        String oldStatus = issue.getIssueStatus() != null ? issue.getIssueStatus().getName() : "";
        String newStatusName = newStatus != null ? newStatus.getName() : "";
        boolean oldForward = issue.isForwardFlowStatus();

        issue.changeStatus(newStatus);

        if (oldForward && issue.isBackwardFlowStatus()) {
            issue.setReworkCount((issue.getReworkCount() == null ? 0 : issue.getReworkCount()) + 1);
        }

        if (!oldStatus.equals(newStatusName)) {
            IssueActivity activity = new IssueActivity(
                    issue,
                    actor,
                    ActivityType.STATUS_CHANGED,
                    "Status",
                    oldStatus,
                    newStatusName);
            activity.setDescription(
                    actor.getUsername() + " đã chuyển '" + issue.getTitle() + "' từ " + oldStatus + " → " + newStatusName);
            issueActivityRepository.save(activity);
        }

        updatePhaseStatusIfNeeded(issue);

        if (issue.getParentIssue() == null) {
            publishIssueEvent(DoAn.BE.project.event.IssueEvent.EventType.STATUS_CHANGED, issue, actor.getUserId());
            if (!oldStatus.equals(newStatusName)) {
                String changeDetail = oldStatus + " → " + newStatusName;
                publishIssueUpdatedEvent(issue, actor, "Cập nhật trạng thái", changeDetail);
            }
        }
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
                if (i.isInProgress()) {
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
        CompanyMember currentMember = accessControlService.getCurrentMember();
        Long companyId = TenantContext.getCompanyId();
        if (currentMember != null
                && currentMember.hasAnyRole(CompanyRole.OWNER, CompanyRole.COMPANY_ADMIN)
                && companyId != null) {
            Project project = entityManager.find(Project.class, projectId);
            if (project != null && project.getCompany() != null && companyId.equals(project.getCompany().getCompanyId())) {
                return;
            }
        }

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

    private void validateAssigneeLeaveStatus(Long assigneeId, java.time.LocalDate startDate, java.time.LocalDate dueDate) {
        if (startDate != null && dueDate != null) {
            if (leaveRequestRepository.hasOverlappingLeaveByUser(assigneeId, startDate, dueDate)) {
                throw new BadRequestException("Nhân viên này đang trong thời gian nghỉ phép. Vui lòng chọn người khác hoặc đổi ngày.");
            }
        } else if (dueDate != null) {
            if (leaveRequestRepository.isUserOnLeave(assigneeId, dueDate)) {
                throw new BadRequestException("Nhân viên này đang nghỉ phép vào ngày đến hạn. Vui lòng chọn người khác hoặc đổi ngày.");
            }
        } else {
            // Check today
            if (leaveRequestRepository.isUserOnLeave(assigneeId, java.time.LocalDate.now())) {
                throw new BadRequestException("Nhân viên này hôm nay đang nghỉ phép. Vui lòng chọn người khác.");
            }
        }
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
        dto.setIssueType(issue.getIssueType());
        dto.setOrderIndex(issue.getOrderIndex());

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
        dto.setInProgressAt(issue.getInProgressAt());
        dto.setReworkCount(issue.getReworkCount());
        dto.setPerformanceScore(issue.getPerformanceScore());
        dto.setCreatedAt(issue.getCreatedAt());
        dto.setUpdatedAt(issue.getUpdatedAt());
        dto.setIsOverdue(issue.isOverdue());
        dto.setParentIssueId(issue.getParentIssue() != null ? issue.getParentIssue().getIssueId() : null);

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

    /**
     * Publish {@link IssueUpdatedEvent} sau khi issue được lưu thành công.
     *
     * <p>Lưu ý:
     * <ul>
     *   <li>Giao cho {@link DoAn.BE.project.listener.IssueNotificationListener#handleIssueUpdated}
     *       xử lý bất đồng bộ (AFTER_COMMIT + @Async).</li>
     *   <li>Actor là User entity đầy đủ — listener dùng nó để loại actor ra khỏi danh sách nhận email.</li>
     * </ul>
     *
     * @param issue        Issue sau khi đã lưu thành công vào DB
     * @param actor        User thực hiện hành động — sẽ bị loại khỏi danh sách nhận
     * @param changeType   Loại thay đổi, VD: "Cập nhật trạng thái", "Bình luận mới"
     * @param changeDetail Chi tiết thay đổi, VD: "To Do → In Progress" (có thể null)
     */
    private void publishIssueUpdatedEvent(Issue issue, User actor, String changeType, String changeDetail) {
        try {
            eventPublisher.publishEvent(new IssueUpdatedEvent(this, issue, changeType, changeDetail, actor));
        } catch (Exception e) {
            // Không được để lỗi event ảnh hưởng luồng chính
            log.warn("Failed to publish IssueUpdatedEvent for issue {}: {}", issue.getIssueKey(), e.getMessage());
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

    @org.springframework.context.event.EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
    @Transactional
    public void initializeInProgressTimestamps() {
        log.info("Initializing inProgressAt timestamps for In Progress issues...");
        try {
            java.util.List<Issue> inProgressIssues = issueRepository.findAll().stream()
                .filter(Issue::isInProgress)
                .filter(i -> i.getInProgressAt() == null)
                .collect(java.util.stream.Collectors.toList());

            for (Issue issue : inProgressIssues) {
                java.util.List<IssueActivity> activities = 
                    issueActivityRepository.findByIssue_IssueIdOrderByCreatedAtDesc(issue.getIssueId());
                java.time.LocalDateTime foundTime = null;
                for (IssueActivity act : activities) {
                    if (act.getActivityType() == DoAn.BE.project.entity.IssueActivity.ActivityType.STATUS_CHANGED &&
                        ("In Progress".equalsIgnoreCase(act.getNewValue()) || "Đang thực hiện".equalsIgnoreCase(act.getNewValue()))) {
                        foundTime = act.getCreatedAt();
                        break;
                    }
                }
                if (foundTime != null) {
                    issue.setInProgressAt(foundTime);
                } else {
                    issue.setInProgressAt(issue.getCreatedAt() != null ? issue.getCreatedAt() : (issue.getUpdatedAt() != null ? issue.getUpdatedAt() : java.time.LocalDateTime.now()));
                }
                issueRepository.save(issue);
            }
            log.info("Successfully initialized inProgressAt timestamps for {} issues.", inProgressIssues.size());
        } catch (Exception e) {
            log.error("Failed to initialize inProgressAt timestamps", e);
        }
    }
}
