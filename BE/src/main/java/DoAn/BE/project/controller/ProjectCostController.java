package DoAn.BE.project.controller;


import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.project.dto.ProjectCostDTO;
import DoAn.BE.project.dto.ProjectExpenseDTO;
import DoAn.BE.project.dto.ProjectExpenseRequest;
import DoAn.BE.project.service.ProjectCostService;
import DoAn.BE.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/projects/costs")
@RequiredArgsConstructor
public class ProjectCostController {

    private final ProjectCostService projectCostService;
    private final AccessControlService accessControlService;

    @GetMapping("/{projectId}")
    public ResponseEntity<ProjectCostDTO> getProjectCost(@PathVariable Long projectId) {
        return ResponseEntity.ok(projectCostService.calculateProjectCost(projectId));
    }

    @PostMapping("/expenses")
    public ResponseEntity<ProjectExpenseDTO> addExpense(
            @Valid @RequestBody ProjectExpenseRequest request,
            @AuthenticationPrincipal User currentUser) {
        accessControlService.checkProjectManageAllPermission();
        return ResponseEntity.ok(projectCostService.addExpense(request, currentUser));
    }
}
