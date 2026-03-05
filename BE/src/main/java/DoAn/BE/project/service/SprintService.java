package DoAn.BE.project.service;

import DoAn.BE.common.exception.*;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.project.dto.*;
import DoAn.BE.project.entity.Project;
import DoAn.BE.project.entity.Sprint;
import DoAn.BE.project.entity.Sprint.SprintStatus;
import DoAn.BE.project.entity.Issue;
import DoAn.BE.project.entity.ProjectMember;
import DoAn.BE.project.repository.ProjectRepository;
import DoAn.BE.project.repository.SprintRepository;
import DoAn.BE.project.repository.IssueRepository;
import DoAn.BE.project.repository.IssueActivityRepository;
import DoAn.BE.project.repository.ProjectMemberRepository;
import DoAn.BE.project.entity.IssueActivity;
import DoAn.BE.project.entity.IssueActivity.ActivityType;
import DoAn.BE.user.entity.User;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SprintService {

    private final SprintRepository sprintRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final IssueRepository issueRepository;
    private final IssueActivityRepository issueActivityRepository;
    private final AccessControlService accessControlService;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;

    @org.springframework.beans.factory.annotation.Autowired
    private jakarta.persistence.EntityManager entityManager;

    @Transactional
    public SprintDTO createSprint(CreateSprintRequest request, User currentUser) {
        // Kiểm tra quyền truy cập project
        if (!accessControlService.canAccessProjects(currentUser)) {
            throw new ForbiddenException("Bạn không có quyền truy cập dự án");
        }

        log.info("User {} tạo sprint mới cho project {}", currentUser.getUsername(), request.getProjectId());
        Project project = projectRepository.findById(request.getProjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dự án"));
        validateProjectManagement(request.getProjectId(), currentUser.getUserId());

        // Validate dates
        if (request.getStartDate() != null && request.getEndDate() != null) {
            if (request.getEndDate().isBefore(request.getStartDate())) {
                throw new BadRequestException("Ngày kết thúc phải sau ngày bắt đầu");
            }
        }

        // Kiểm tra không có sprint ACTIVE khác
        // Fix: Acquire lock on project to prevent concurrent sprint creations bypassing
        // the check
        Project lockedProject = entityManager.find(Project.class, request.getProjectId(),
                jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        List<Sprint> activeSprints = sprintRepository.findByProject_ProjectIdAndStatus(
                lockedProject.getProjectId(), SprintStatus.ACTIVE);
        if (!activeSprints.isEmpty()) {
            throw new BadRequestException("Dự án đã có sprint đang hoạt động");
        }

        // Create sprint
        Sprint sprint = new Sprint();
        sprint.setProject(project);
        sprint.setName(request.getName());
        sprint.setGoal(request.getGoal());
        sprint.setStartDate(request.getStartDate());
        sprint.setEndDate(request.getEndDate());
        sprint.setCreatedBy(currentUser);
        sprint.setStatus(SprintStatus.PLANNING);

        sprint = sprintRepository.save(sprint);
        SprintDTO sprintDTO = convertToDTO(sprint);

        // Publish Event
        eventPublisher.publishEvent(new DoAn.BE.project.event.SprintEvent(this,
                DoAn.BE.project.event.SprintEvent.Type.CREATED, sprintDTO, currentUser.getUserId()));

        return sprintDTO;
    }

    @Transactional(readOnly = true)
    public SprintDTO getSprintById(Long sprintId, User currentUser) {
        if (!accessControlService.canAccessProjects(currentUser)) {
            throw new ForbiddenException("Bạn không có quyền truy cập dự án");
        }

        Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sprint"));

        if (sprint.getProject() == null) {
            throw new IllegalStateException("Sprint không có dự án liên kết");
        }

        validateProjectAccess(sprint.getProject().getProjectId(), currentUser.getUserId());

        return convertToDTO(sprint);
    }

    @Transactional(readOnly = true)
    public List<SprintDTO> getProjectSprints(Long projectId, User currentUser) {
        if (!accessControlService.canAccessProjects(currentUser)) {
            throw new ForbiddenException("Bạn không có quyền truy cập dự án");
        }

        // Kiểm tra quyền truy cập project
        validateProjectAccess(projectId, currentUser.getUserId());

        List<Sprint> sprints = sprintRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
        return sprints.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public SprintDTO updateSprint(Long sprintId, UpdateSprintRequest request, User currentUser) {
        Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sprint"));

        if (sprint.getProject() == null) {
            throw new IllegalStateException("Sprint không có dự án liên kết");
        }

        validateProjectManagement(sprint.getProject().getProjectId(), currentUser.getUserId());

        // Cập nhật các trường thông tin
        if (request.getName() != null) {
            sprint.setName(request.getName());
        }
        if (request.getGoal() != null) {
            sprint.setGoal(request.getGoal());
        }
        if (request.getStartDate() != null) {
            sprint.setStartDate(request.getStartDate());
        }
        if (request.getEndDate() != null) {
            sprint.setEndDate(request.getEndDate());
        }
        if (request.getStatus() != null) {
            // Validate chuyển trạng thái
            validateStatusTransition(sprint, request.getStatus());
            sprint.setStatus(request.getStatus());
        }

        // Validate ngày tháng
        if (sprint.getStartDate() != null && sprint.getEndDate() != null) {
            if (sprint.getEndDate().isBefore(sprint.getStartDate())) {
                throw new BadRequestException("Ngày kết thúc phải sau ngày bắt đầu");
            }
        }

        sprint = sprintRepository.save(sprint);
        return convertToDTO(sprint);
    }

    @Transactional
    public void deleteSprint(Long sprintId, User currentUser) {
        Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sprint"));

        if (sprint.getProject() == null) {
            throw new IllegalStateException("Sprint không có dự án liên kết");
        }

        validateProjectManagement(sprint.getProject().getProjectId(), currentUser.getUserId());

        // Không thể xóa sprint đang ACTIVE
        if (sprint.getStatus() == SprintStatus.ACTIVE) {
            throw new BadRequestException("Không thể xóa sprint đang hoạt động");
        }

        // Move all issues back to backlog (remove sprint assignment)
        List<Issue> sprintIssues = issueRepository.findBySprint_SprintId(sprintId);
        for (Issue issue : sprintIssues) {
            issue.setSprint(null);
        }
        issueRepository.saveAll(sprintIssues);

        sprintRepository.delete(sprint);
    }

    @Transactional
    public SprintDTO startSprint(Long sprintId, User currentUser) {
        Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sprint"));

        if (sprint.getProject() == null) {
            throw new IllegalStateException("Sprint không có dự án liên kết");
        }

        validateProjectManagement(sprint.getProject().getProjectId(), currentUser.getUserId());

        if (!sprint.canBeStarted()) {
            throw new BadRequestException("Sprint không thể bắt đầu. Kiểm tra trạng thái và ngày tháng.");
        }

        // Kiểm tra không có sprint ACTIVE khác
        // Fix: Use PESSIMISTIC_WRITE lock to prevent race condition during start
        Project lockedProject = entityManager.find(Project.class, sprint.getProject().getProjectId(),
                jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        List<Sprint> activeSprints = sprintRepository.findByProject_ProjectIdAndStatus(
                lockedProject.getProjectId(), SprintStatus.ACTIVE);
        if (!activeSprints.isEmpty()) {
            throw new BadRequestException("Dự án đã có sprint đang hoạt động");
        }

        sprint.setStatus(SprintStatus.ACTIVE);
        sprint = sprintRepository.save(sprint);

        // Log activity for all issues in this sprint
        List<Issue> sprintIssues = issueRepository.findBySprint_SprintId(sprintId);
        if (!sprintIssues.isEmpty()) {
            Issue firstIssue = sprintIssues.get(0);
            issueActivityRepository.save(new IssueActivity(firstIssue, currentUser, ActivityType.SPRINT_CHANGED,
                    currentUser.getUsername() + " đã bắt đầu sprint '" + sprint.getName() + "' với "
                            + sprintIssues.size() + " issues"));
        }

        log.info("Sprint {} started", sprint.getName());

        SprintDTO sprintDTO = convertToDTO(sprint);

        // Publish Event
        eventPublisher.publishEvent(new DoAn.BE.project.event.SprintEvent(this,
                DoAn.BE.project.event.SprintEvent.Type.STARTED, sprintDTO, currentUser.getUserId()));

        return sprintDTO;
    }

    @Transactional
    public SprintDTO completeSprint(Long sprintId, User currentUser) {
        Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sprint"));

        if (sprint.getProject() == null) {
            throw new IllegalStateException("Sprint không có dự án liên kết");
        }

        validateProjectManagement(sprint.getProject().getProjectId(), currentUser.getUserId());

        if (!sprint.canBeCompleted()) {
            throw new BadRequestException("Sprint không thể hoàn thành. Chỉ sprint ACTIVE mới có thể hoàn thành.");
        }

        sprint.setStatus(SprintStatus.COMPLETED);
        sprint = sprintRepository.save(sprint);

        // Tính toán thống kê hoàn thành
        List<Issue> sprintIssues = issueRepository.findBySprint_SprintId(sprintId);
        int totalIssues = sprintIssues.size();
        int completedIssues = (int) sprintIssues.stream()
                .filter(Issue::isDone)
                .count();

        // Log activity for sprint completion
        if (!sprintIssues.isEmpty()) {
            Issue firstIssue = sprintIssues.get(0);
            issueActivityRepository.save(new IssueActivity(firstIssue, currentUser, ActivityType.SPRINT_CHANGED,
                    currentUser.getUsername() + " đã hoàn thành sprint '" + sprint.getName() + "' (" + completedIssues
                            + "/" + totalIssues + " issues hoàn thành)"));
        }

        sprintIssues.stream()
                .filter(issue -> !issue.isDone())
                .forEach(issue -> {
                    issue.setSprint(null);
                    issueRepository.save(issue);
                });

        log.info("Sprint {} completed. {}/{} issues done. {} moved to backlog.",
                sprint.getName(), completedIssues, totalIssues, totalIssues - completedIssues);

        SprintDTO sprintDTO = convertToDTO(sprint);
        sprintDTO.setTotalIssues(totalIssues);
        sprintDTO.setCompletedIssues(completedIssues);

        // Publish Event
        eventPublisher.publishEvent(new DoAn.BE.project.event.SprintEvent(this,
                DoAn.BE.project.event.SprintEvent.Type.COMPLETED, sprintDTO, currentUser.getUserId()));

        return sprintDTO;
    }

    @Transactional
    public void addIssueToSprint(Long sprintId, Long issueId, User currentUser) {
        Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sprint"));

        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy issue"));

        if (sprint.getProject() == null) {
            throw new IllegalStateException("Sprint không có dự án liên kết");
        }

        if (issue.getProject() == null) {
            throw new IllegalStateException("Issue không có dự án liên kết");
        }

        validateProjectManagement(sprint.getProject().getProjectId(), currentUser.getUserId());

        if (!issue.getProject().getProjectId().equals(sprint.getProject().getProjectId())) {
            throw new BadRequestException("Issue không thuộc dự án này");
        }

        // Chỉ có thể add vào sprint PLANNING hoặc ACTIVE
        if (sprint.getStatus() == SprintStatus.COMPLETED || sprint.getStatus() == SprintStatus.CANCELLED) {
            throw new BadRequestException("Không thể thêm issue vào sprint đã hoàn thành hoặc bị hủy");
        }

        String oldSprintName = issue.getSprint() != null ? issue.getSprint().getName() : null;
        issue.setSprint(sprint);
        issueRepository.save(issue);

        // Log activity
        issueActivityRepository.save(new IssueActivity(issue, currentUser, ActivityType.SPRINT_CHANGED,
                "Sprint", oldSprintName, sprint.getName()));
    }

    @Transactional
    public void removeIssueFromSprint(Long sprintId, Long issueId, User currentUser) {
        Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sprint"));

        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy issue"));

        if (sprint.getProject() == null) {
            throw new IllegalStateException("Sprint không có dự án liên kết");
        }

        validateProjectManagement(sprint.getProject().getProjectId(), currentUser.getUserId());

        // Kiểm tra issue có thuộc sprint này không
        if (issue.getSprint() == null || !issue.getSprint().getSprintId().equals(sprintId)) {
            throw new BadRequestException("Issue không thuộc sprint này");
        }

        String oldSprintName = sprint.getName();
        issue.setSprint(null);
        issueRepository.save(issue);

        // Log activity
        issueActivityRepository.save(new IssueActivity(issue, currentUser, ActivityType.SPRINT_CHANGED,
                "Sprint", oldSprintName, null));
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

    private void validateStatusTransition(Sprint sprint, SprintStatus newStatus) {
        SprintStatus currentStatus = sprint.getStatus();

        switch (currentStatus) {
            case PLANNING:
                if (newStatus != SprintStatus.ACTIVE && newStatus != SprintStatus.CANCELLED) {
                    throw new BadRequestException("Sprint PLANNING chỉ có thể chuyển sang ACTIVE hoặc CANCELLED");
                }
                break;
            case ACTIVE:
                if (newStatus != SprintStatus.COMPLETED && newStatus != SprintStatus.CANCELLED) {
                    throw new BadRequestException("Sprint ACTIVE chỉ có thể chuyển sang COMPLETED hoặc CANCELLED");
                }
                break;
            case COMPLETED:
            case CANCELLED:
                throw new BadRequestException("Không thể thay đổi trạng thái sprint đã hoàn thành hoặc bị hủy");
        }
    }

    private SprintDTO convertToDTO(Sprint sprint) {
        SprintDTO dto = new SprintDTO();
        dto.setSprintId(sprint.getSprintId());

        if (sprint.getProject() != null) {
            dto.setProjectId(sprint.getProject().getProjectId());
            dto.setProjectName(sprint.getProject().getName());
        }

        dto.setName(sprint.getName());
        dto.setGoal(sprint.getGoal());
        dto.setStartDate(sprint.getStartDate());
        dto.setEndDate(sprint.getEndDate());
        dto.setStatus(sprint.getStatus());

        if (sprint.getCreatedBy() != null) {
            dto.setCreatedBy(sprint.getCreatedBy().getUserId());
            dto.setCreatedByName(sprint.getCreatedBy().getUsername());
        }

        dto.setCreatedAt(sprint.getCreatedAt());
        long totalIssues = issueRepository.countBySprint_SprintId(sprint.getSprintId());
        long completedIssues = issueRepository.countCompletedBySprint(sprint.getSprintId());
        dto.setTotalIssues((int) totalIssues);
        dto.setCompletedIssues((int) completedIssues);

        return dto;
    }
}
