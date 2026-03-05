package DoAn.BE.ai.service.handler;

import java.time.LocalDate;
import java.util.Map;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import DoAn.BE.ai.dto.AIActionDTO;
import DoAn.BE.ai.dto.AIActionDTO.ActionStatus;
import DoAn.BE.common.util.MapUtils;
import DoAn.BE.project.entity.Project;
import DoAn.BE.project.entity.Sprint;
import DoAn.BE.project.repository.ProjectRepository;
import DoAn.BE.project.repository.ProjectMemberRepository;
import DoAn.BE.project.repository.SprintRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// Handles sprint-related AI actions: create, start, complete.
// /
@Component
@RequiredArgsConstructor
@Slf4j
@Transactional
public class SprintActionHandler {

    private final SprintRepository sprintRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final UserRepository userRepository;

    public AIActionDTO createSprint(AIActionDTO action, Long userId) {
        Map<String, Object> data = action.getData();

        Long projectId = MapUtils.getLong(data, "projectId");
        String name = MapUtils.getString(data, "name", "Sprint mới");
        String goal = MapUtils.getString(data, "goal", "");
        Integer durationDays = MapUtils.getInt(data, "durationDays", 14);

        if (projectId == null) {
            action.setStatus(ActionStatus.FAILED);
            action.setMessage("Vui lòng chỉ định dự án để tạo sprint");
            return action;
        }

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new DoAn.BE.common.exception.ResourceNotFoundException("Project not found"));
        User creator = userRepository.findById(userId)
                .orElseThrow(() -> new DoAn.BE.common.exception.ResourceNotFoundException("User not found"));

        Sprint sprint = new Sprint();
        sprint.setProject(project);
        sprint.setName(name);
        sprint.setGoal(goal);
        sprint.setStatus(Sprint.SprintStatus.PLANNING);
        sprint.setCreatedBy(creator);
        sprint.setStartDate(LocalDate.now());
        sprint.setEndDate(LocalDate.now().plusDays(durationDays));
        sprint = sprintRepository.save(sprint);

        log.info("Created sprint: {} in project: {}", name, project.getKeyProject());

        action.setStatus(ActionStatus.EXECUTED);
        action.setEntityId(sprint.getSprintId());
        action.setEntityName(sprint.getName());
        action.setMessage(String.format("✅ Đã tạo sprint \"%s\" thành công! (Từ %s đến %s)",
                name, sprint.getStartDate(), sprint.getEndDate()));

        return action;
    }

    public AIActionDTO startSprint(AIActionDTO action, Long userId) {
        Map<String, Object> data = action.getData();
        Long sprintId = MapUtils.getLong(data, "sprintId");

        if (sprintId == null) {
            action.setStatus(ActionStatus.FAILED);
            action.setMessage("Thiếu thông tin sprint");
            return action;
        }

        Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new DoAn.BE.common.exception.ResourceNotFoundException("Sprint not found"));
        if (sprint.getProject() != null) {
            projectMemberRepository.findByProject_ProjectIdAndUser_UserId(
                    sprint.getProject().getProjectId(), userId)
                    .orElseThrow(() -> new DoAn.BE.common.exception.ForbiddenException(
                            "Bạn không có quyền quản lý sprint này"));
        }

        sprint.setStatus(Sprint.SprintStatus.ACTIVE);
        sprint.setStartDate(LocalDate.now());
        sprintRepository.save(sprint);

        action.setStatus(ActionStatus.EXECUTED);
        action.setMessage(String.format("✅ Đã bắt đầu sprint \"%s\"", sprint.getName()));

        return action;
    }

    public AIActionDTO completeSprint(AIActionDTO action, Long userId) {
        Map<String, Object> data = action.getData();
        Long sprintId = MapUtils.getLong(data, "sprintId");

        if (sprintId == null) {
            action.setStatus(ActionStatus.FAILED);
            action.setMessage("Thiếu thông tin sprint");
            return action;
        }

        Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new DoAn.BE.common.exception.ResourceNotFoundException("Sprint not found"));
        if (sprint.getProject() != null) {
            projectMemberRepository.findByProject_ProjectIdAndUser_UserId(
                    sprint.getProject().getProjectId(), userId)
                    .orElseThrow(() -> new DoAn.BE.common.exception.ForbiddenException(
                            "Bạn không có quyền quản lý sprint này"));
        }

        sprint.setStatus(Sprint.SprintStatus.COMPLETED);
        sprint.setEndDate(LocalDate.now());
        sprintRepository.save(sprint);

        action.setStatus(ActionStatus.EXECUTED);
        action.setMessage(String.format("✅ Đã hoàn thành sprint \"%s\"", sprint.getName()));

        return action;
    }
}
