package DoAn.BE.smart.controller;

import DoAn.BE.smart.dto.*;
import DoAn.BE.smart.service.*;
import DoAn.BE.project.service.IssueService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/smart-assistant")
@RequiredArgsConstructor
public class SmartAssistantController {

    private final SmartAssistantService smartAssistantService;
    private final TaskAssignmentService taskAssignmentService;
    private final ScorelikeSuggestionService scoreSuggestionService;
    private final SprintHealthService sprintHealthService;
    private final WorkloadAnalysisService workloadAnalysisService;
    private final ProjectRiskService projectRiskService;
    private final IssueService issueService;

    @GetMapping
    public ResponseEntity<?> getSmartAssistant(
            @RequestParam String action,
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) Long sprintId,
            @RequestParam(required = false) Long employeeId,
            @RequestParam(required = false) Long issueId,
            @RequestParam(required = false) String reviewPeriod,
            @RequestParam(required = false) Long userId) {

        return switch (action) {
            case "summary" -> ResponseEntity.ok(
                    smartAssistantService.getSummary(projectId, sprintId, userId));
            case "task-assignment" -> ResponseEntity.ok(
                    taskAssignmentService.getAssignments(projectId, userId));
            case "score-suggestion" -> {
                if (issueId != null) {
                    yield ResponseEntity.ok(scoreSuggestionService.suggestQuickScore(issueId));
                } else if (employeeId != null && reviewPeriod != null) {
                    yield ResponseEntity.ok(scoreSuggestionService.suggestFullReview(employeeId, reviewPeriod));
                } else {
                    yield ResponseEntity.badRequest().body(
                            java.util.Map.of("error", "Cần cung cấp issueId hoặc employeeId + reviewPeriod"));
                }
            }
            case "sprint-health" -> ResponseEntity.ok(
                    sprintHealthService.getHealth(sprintId));
            case "workload" -> ResponseEntity.ok(
                    workloadAnalysisService.getWorkload(projectId));
            case "project-risk" -> ResponseEntity.ok(
                    projectRiskService.getRisk(projectId));
            default -> ResponseEntity.badRequest().body(
                    java.util.Map.of("error", "Action không hợp lệ: " + action));
        };
    }

    @PostMapping("/assign")
    public ResponseEntity<?> batchAssign(@RequestBody java.util.List<java.util.Map<String, Long>> assignments) {
        int count = 0;
        for (var a : assignments) {
            Long issueId = a.get("issueId");
            Long assigneeId = a.get("assigneeId");
            if (issueId != null && assigneeId != null) {
                try {
                    issueService.assignIssue(issueId, assigneeId, null);
                    count++;
                } catch (Exception e) {
                    // skip failed assignments
                }
            }
        }
        return ResponseEntity.ok(java.util.Map.of("assigned", count, "total", assignments.size()));
    }
}
