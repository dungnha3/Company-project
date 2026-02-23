package DoAn.BE.user.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import DoAn.BE.user.dto.PersonalTaskDto;
import DoAn.BE.user.entity.PersonalTask.TaskStatus;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.service.PersonalTaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * PersonalTaskController - API cho Personal Tasks
 * 
 * Base path: /api/me/tasks
 * 
 * FREE: 10 tasks max
 * PRO: Unlimited + Labels + Recurring + Reminders
 */
@RestController
@RequestMapping("/api/me/tasks")
@RequiredArgsConstructor
public class PersonalTaskController {

    private final PersonalTaskService taskService;

    /**
     * GET /api/me/tasks
     * Lấy danh sách personal tasks
     */
    @GetMapping
    public ResponseEntity<List<PersonalTaskDto.Response>> getTasks(
            @RequestParam(required = false) TaskStatus status,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(taskService.getTasks(currentUser.getUserId(), status));
    }

    /**
     * GET /api/me/tasks/stats
     * Lấy thống kê và quota info
     */
    @GetMapping("/stats")
    public ResponseEntity<PersonalTaskDto.StatsResponse> getStats(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(taskService.getStats(currentUser.getUserId()));
    }

    /**
     * POST /api/me/tasks
     * Tạo task mới (kiểm tra quota)
     */
    @PostMapping
    public ResponseEntity<PersonalTaskDto.Response> createTask(
            @Valid @RequestBody PersonalTaskDto.CreateRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(taskService.createTask(currentUser.getUserId(), request));
    }

    /**
     * PUT /api/me/tasks/{id}
     * Cập nhật task
     */
    @PutMapping("/{id}")
    public ResponseEntity<PersonalTaskDto.Response> updateTask(
            @PathVariable Long id,
            @Valid @RequestBody PersonalTaskDto.UpdateRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(taskService.updateTask(currentUser.getUserId(), id, request));
    }

    /**
     * DELETE /api/me/tasks/{id}
     * Xóa task
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        taskService.deleteTask(currentUser.getUserId(), id);
        return ResponseEntity.noContent().build();
    }
}
