package DoAn.BE.project.controller;

import DoAn.BE.project.dto.ProjectGoalDTO;
import DoAn.BE.project.entity.Project;
import DoAn.BE.project.entity.ProjectGoal;
import DoAn.BE.project.repository.ProjectGoalRepository;
import DoAn.BE.project.repository.ProjectMemberRepository;
import DoAn.BE.common.exception.ProjectAccessDeniedException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/projects/{projectId}/goals")
@RequiredArgsConstructor
public class ProjectGoalController {

    private final ProjectGoalRepository goalRepository;
    private final ProjectMemberRepository memberRepository;
    private final jakarta.persistence.EntityManager entityManager;
    private final AccessControlService accessControlService;

    @GetMapping
    public ResponseEntity<List<ProjectGoalDTO>> getGoals(
            @PathVariable Long projectId,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year,
            Authentication authentication) {
        validateAccess(projectId, authentication);
        List<ProjectGoal> goals;
        if (month != null && year != null) {
            goals = goalRepository.findByProject_ProjectIdAndMonthAndYearOrderByCreatedAtAsc(projectId, month, year);
        } else {
            goals = goalRepository.findByProject_ProjectIdOrderByYearDescMonthDescCreatedAtAsc(projectId);
        }
        return ResponseEntity.ok(goals.stream().map(this::toDTO).collect(Collectors.toList()));
    }

    @PostMapping
    public ResponseEntity<ProjectGoalDTO> createGoal(
            @PathVariable Long projectId,
            @RequestBody ProjectGoalDTO request,
            Authentication authentication) {
        validateAccess(projectId, authentication);
        accessControlService.checkProjectManagePhasesPermission();
        Project project = entityManager.find(Project.class, projectId);
        if (project == null)
            throw new ResourceNotFoundException("Không tìm thấy dự án");

        ProjectGoal goal = new ProjectGoal();
        goal.setProject(project);
        goal.setTitle(request.getTitle());
        goal.setMonth(request.getMonth());
        goal.setYear(request.getYear());
        goal.setIsCompleted(false);
        goal = goalRepository.save(goal);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(goal));
    }

    @PatchMapping("/{goalId}/toggle")
    public ResponseEntity<ProjectGoalDTO> toggleGoal(
            @PathVariable Long projectId,
            @PathVariable Long goalId,
            Authentication authentication) {
        validateAccess(projectId, authentication);
        accessControlService.checkProjectManagePhasesPermission();
        ProjectGoal goal = goalRepository.findById(goalId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy mục tiêu"));
        goal.setIsCompleted(!goal.getIsCompleted());
        goal = goalRepository.save(goal);
        return ResponseEntity.ok(toDTO(goal));
    }

    @DeleteMapping("/{goalId}")
    public ResponseEntity<Void> deleteGoal(
            @PathVariable Long projectId,
            @PathVariable Long goalId,
            Authentication authentication) {
        validateAccess(projectId, authentication);
        accessControlService.checkProjectManagePhasesPermission();
        goalRepository.deleteById(goalId);
        return ResponseEntity.noContent().build();
    }

    private void validateAccess(Long projectId, Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        memberRepository.findByProject_ProjectIdAndUser_UserId(projectId, user.getUserId())
                .orElseThrow(() -> new ProjectAccessDeniedException("Bạn không có quyền truy cập dự án này"));
    }

    private ProjectGoalDTO toDTO(ProjectGoal g) {
        ProjectGoalDTO dto = new ProjectGoalDTO();
        dto.setGoalId(g.getGoalId());
        dto.setProjectId(g.getProject().getProjectId());
        dto.setTitle(g.getTitle());
        dto.setMonth(g.getMonth());
        dto.setYear(g.getYear());
        dto.setIsCompleted(g.getIsCompleted());
        dto.setCreatedAt(g.getCreatedAt());
        dto.setUpdatedAt(g.getUpdatedAt());
        return dto;
    }
}
