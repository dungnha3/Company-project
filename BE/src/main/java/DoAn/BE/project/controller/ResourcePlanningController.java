package DoAn.BE.project.controller;

import DoAn.BE.common.annotation.FeatureFlag;
import DoAn.BE.project.dto.ResourceAllocationDTO;
import DoAn.BE.project.dto.ResourceAllocationRequest;
import DoAn.BE.project.service.ResourceAllocationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@RestController
@RequestMapping("/api/resources")
@FeatureFlag("RESOURCE_PLANNING")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ResourcePlanningController {

    private final ResourceAllocationService allocationService;

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
}
