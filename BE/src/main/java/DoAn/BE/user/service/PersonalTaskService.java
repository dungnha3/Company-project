package DoAn.BE.user.service;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.company.entity.Plan;
import DoAn.BE.user.dto.PersonalTaskDto;
import DoAn.BE.user.entity.PersonalTask;
import DoAn.BE.user.entity.PersonalTask.TaskStatus;
import DoAn.BE.user.entity.PersonalWorkspace;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.PersonalTaskRepository;
import DoAn.BE.user.repository.PersonalWorkspaceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class PersonalTaskService {

    private final PersonalTaskRepository taskRepository;
    private final PersonalWorkspaceRepository workspaceRepository;
    private final UserService userService;

    // Quota constants
    private static final int FREE_MAX_TASKS = 10;
    private static final int STARTER_MAX_TASKS = 50;
    private static final int PRO_MAX_TASKS = -1; // Unlimited

    // ===== CRUD Operations =====

    @Transactional(readOnly = true)
    public List<PersonalTaskDto.Response> getTasks(Long userId, TaskStatus statusFilter) {
        PersonalWorkspace workspace = getWorkspaceByUser(userId);

        List<PersonalTask> tasks;
        if (statusFilter != null) {
            tasks = taskRepository.findByWorkspace_WorkspaceIdAndStatusOrderByCreatedAtDesc(
                    workspace.getWorkspaceId(), statusFilter);
        } else {
            tasks = taskRepository.findByWorkspace_WorkspaceIdOrderByCreatedAtDesc(workspace.getWorkspaceId());
        }

        return tasks.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PersonalTaskDto.StatsResponse getStats(Long userId) {
        PersonalWorkspace workspace = getWorkspaceByUser(userId);
        User user = userService.getUserById(userId);
        Plan plan = user.getPersonalPlan() != null ? user.getPersonalPlan() : Plan.FREE;

        long total = taskRepository.countByWorkspace_WorkspaceId(workspace.getWorkspaceId());
        long done = taskRepository.countByWorkspace_WorkspaceIdAndStatus(workspace.getWorkspaceId(), TaskStatus.DONE);
        long inProgress = taskRepository.countByWorkspace_WorkspaceIdAndStatus(workspace.getWorkspaceId(),
                TaskStatus.IN_PROGRESS);
        long todo = taskRepository.countByWorkspace_WorkspaceIdAndStatus(workspace.getWorkspaceId(), TaskStatus.TODO);
        long overdue = taskRepository.countOverdue(workspace.getWorkspaceId(), LocalDate.now());

        int maxTasks = getMaxTasks(plan);
        boolean isPro = plan == Plan.PROFESSIONAL || plan == Plan.ENTERPRISE;

        return PersonalTaskDto.StatsResponse.builder()
                .total((int) total)
                .todo((int) todo)
                .inProgress((int) inProgress)
                .done((int) done)
                .overdue((int) overdue)
                .maxTasks(maxTasks)
                .atLimit(maxTasks > 0 && total >= maxTasks)
                .isPro(isPro)
                .build();
    }

    @Transactional
    public PersonalTaskDto.Response createTask(Long userId, PersonalTaskDto.CreateRequest request) {
        PersonalWorkspace workspace = getWorkspaceByUser(userId);
        User user = userService.getUserById(userId);
        Plan plan = user.getPersonalPlan() != null ? user.getPersonalPlan() : Plan.FREE;

        // Check quota
        long currentCount = taskRepository.countByWorkspace_WorkspaceId(workspace.getWorkspaceId());
        int maxTasks = getMaxTasks(plan);
        if (maxTasks > 0 && currentCount >= maxTasks) {
            throw new ForbiddenException(
                    String.format("Bạn đã đạt giới hạn %d tasks. Nâng cấp gói PRO để tạo không giới hạn!", maxTasks));
        }

        // Check PRO features
        boolean isPro = plan == Plan.PROFESSIONAL || plan == Plan.ENTERPRISE;
        if (!isPro) {
            if (request.getLabels() != null && !request.getLabels().isEmpty()) {
                throw new ForbiddenException("Labels là tính năng PRO. Vui lòng nâng cấp để sử dụng.");
            }
            if (request.getRecurringPattern() != null) {
                throw new ForbiddenException("Recurring tasks là tính năng PRO. Vui lòng nâng cấp để sử dụng.");
            }
            if (request.getReminderAt() != null) {
                throw new ForbiddenException("Reminders là tính năng PRO. Vui lòng nâng cấp để sử dụng.");
            }
        }

        PersonalTask task = PersonalTask.builder()
                .workspace(workspace)
                .title(request.getTitle())
                .description(request.getDescription())
                .dueDate(request.getDueDate())
                .priority(request.getPriority() != null ? request.getPriority() : PersonalTask.TaskPriority.MEDIUM)
                .labels(request.getLabels() != null ? String.join(",", request.getLabels()) : null)
                .recurringPattern(request.getRecurringPattern())
                .reminderAt(request.getReminderAt())
                .build();

        task = taskRepository.save(task);
        log.info("User {} created personal task: {}", userId, task.getTaskId());

        return toResponse(task);
    }

    @Transactional
    public PersonalTaskDto.Response updateTask(Long userId, Long taskId, PersonalTaskDto.UpdateRequest request) {
        PersonalTask task = getTaskByIdAndUser(taskId, userId);
        User user = userService.getUserById(userId);
        Plan plan = user.getPersonalPlan() != null ? user.getPersonalPlan() : Plan.FREE;
        boolean isPro = plan == Plan.PROFESSIONAL || plan == Plan.ENTERPRISE;

        // Check PRO features
        if (!isPro) {
            if (request.getLabels() != null && !request.getLabels().isEmpty()) {
                throw new ForbiddenException("Labels là tính năng PRO.");
            }
            if (request.getRecurringPattern() != null) {
                throw new ForbiddenException("Recurring tasks là tính năng PRO.");
            }
            if (request.getReminderAt() != null) {
                throw new ForbiddenException("Reminders là tính năng PRO.");
            }
        }

        // Update fields
        if (request.getTitle() != null) {
            task.setTitle(request.getTitle());
        }
        if (request.getDescription() != null) {
            task.setDescription(request.getDescription());
        }
        if (request.getDueDate() != null) {
            task.setDueDate(request.getDueDate());
        }
        if (request.getStatus() != null) {
            task.setStatus(request.getStatus());
        }
        if (request.getPriority() != null) {
            task.setPriority(request.getPriority());
        }
        if (request.getLabels() != null) {
            task.setLabels(String.join(",", request.getLabels()));
        }
        if (request.getRecurringPattern() != null) {
            task.setRecurringPattern(request.getRecurringPattern());
        }
        if (request.getReminderAt() != null) {
            task.setReminderAt(request.getReminderAt());
            task.setReminderSent(false); // Reset reminder
        }

        task = taskRepository.save(task);
        log.info("User {} updated personal task: {}", userId, taskId);

        return toResponse(task);
    }

    @Transactional
    public void deleteTask(Long userId, Long taskId) {
        PersonalTask task = getTaskByIdAndUser(taskId, userId);
        taskRepository.delete(task);
        log.info("User {} deleted personal task: {}", userId, taskId);
    }

    // ===== Helpers =====

    private PersonalWorkspace getWorkspaceByUser(Long userId) {
        return workspaceRepository.findByUser_UserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Personal workspace không tồn tại"));
    }

    private PersonalTask getTaskByIdAndUser(Long taskId, Long userId) {
        PersonalTask task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task không tồn tại"));

        PersonalWorkspace workspace = getWorkspaceByUser(userId);
        if (!task.getWorkspace().getWorkspaceId().equals(workspace.getWorkspaceId())) {
            throw new ForbiddenException("Bạn không có quyền truy cập task này");
        }

        return task;
    }

    private int getMaxTasks(Plan plan) {
        return switch (plan) {
            case ENTERPRISE, PROFESSIONAL -> PRO_MAX_TASKS;
            case STARTER -> STARTER_MAX_TASKS;
            default -> FREE_MAX_TASKS;
        };
    }

    private PersonalTaskDto.Response toResponse(PersonalTask task) {
        return PersonalTaskDto.Response.builder()
                .taskId(task.getTaskId())
                .title(task.getTitle())
                .description(task.getDescription())
                .dueDate(task.getDueDate())
                .status(task.getStatus())
                .priority(task.getPriority())
                .overdue(task.isOverdue())
                .labels(task.getLabels() != null ? Arrays.asList(task.getLabels().split(",")) : null)
                .recurringPattern(task.getRecurringPattern())
                .reminderAt(task.getReminderAt())
                .createdAt(task.getCreatedAt())
                .completedAt(task.getCompletedAt())
                .build();
    }
}
