package DoAn.BE.project.controller;

import DoAn.BE.common.annotation.FeatureFlag;
import DoAn.BE.project.dto.ResourceAllocationDTO;
import DoAn.BE.project.dto.ResourceAllocationRequest;
import DoAn.BE.project.dto.ResourceOverviewDTO;
import DoAn.BE.project.service.ResourceAllocationService;
import DoAn.BE.project.service.ProjectMemberService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/resources")
@FeatureFlag("RESOURCE_PLANNING")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ResourcePlanningController {

    private final ResourceAllocationService allocationService;
    private final ProjectMemberService projectMemberService;

    @GetMapping("/allocations")
    public ResponseEntity<List<ResourceAllocationDTO>> getAllAllocations() {
        return ResponseEntity.ok(allocationService.getAllocations());
    }

    @GetMapping("/employee/{empId}")
    public ResponseEntity<List<ResourceAllocationDTO>> getByEmployee(@PathVariable Long empId) {
        return ResponseEntity.ok(allocationService.getAllocationsByEmployee(empId));
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<ResourceAllocationDTO>> getByProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(allocationService.getAllocationsByProject(projectId));
    }

    @PostMapping("/allocations")
    public ResponseEntity<ResourceAllocationDTO> create(
            @Valid @RequestBody ResourceAllocationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(allocationService.create(request));
    }

    @PutMapping("/allocations/{id}")
    public ResponseEntity<ResourceAllocationDTO> update(
            @PathVariable Long id,
            @Valid @RequestBody ResourceAllocationRequest request) {
        return ResponseEntity.ok(allocationService.update(id, request));
    }

    @DeleteMapping("/allocations/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        allocationService.delete(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * GET /api/resources/check-overload/{userId}
     * Kiểm tra user có đang bị overload (tổng allocation > 100%) không.
     */
    @GetMapping("/check-overload/{userId}")
    public ResponseEntity<Map<String, Object>> checkOverload(@PathVariable Long userId) {
        List<ResourceOverviewDTO> overview = projectMemberService.getResourceOverview();
        return overview.stream()
                .filter(r -> r.getUserId().equals(userId))
                .findFirst()
                .map(r -> ResponseEntity.ok(Map.<String, Object>of(
                        "userId", r.getUserId(),
                        "fullName", r.getFullName(),
                        "totalAllocation", r.getTotalAllocation(),
                        "overloaded", r.getOverloaded(),
                        "projects", r.getProjects()
                )))
                .orElse(ResponseEntity.ok(Map.of(
                        "userId", userId,
                        "totalAllocation", 0,
                        "overloaded", false,
                        "projects", List.of()
                )));
    }

    /**
     * GET /api/resources/available?from=&to=
     * Tìm nhân sự còn khả dụng (allocation < 80%) trong khoảng thời gian cho trước.
     * Hiện tại dựa vào allocationRate tổng trong ProjectMember (live data).
     */
    @GetMapping("/available")
    public ResponseEntity<List<ResourceOverviewDTO>> getAvailable(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        List<ResourceOverviewDTO> available = projectMemberService.getResourceOverview().stream()
                .filter(r -> !r.getOverloaded() && r.getTotalAllocation() < 80)
                .toList();
        return ResponseEntity.ok(available);
    }
}

