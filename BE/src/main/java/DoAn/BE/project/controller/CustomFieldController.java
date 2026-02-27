package DoAn.BE.project.controller;

import DoAn.BE.common.annotation.FeatureFlag;

import DoAn.BE.project.dto.CustomFieldDto;
import DoAn.BE.project.service.CustomFieldService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

// Controller for managing custom fields
// Allows creating project-specific custom fields for issues (like Jira)
// /
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Custom Fields", description = "Manage custom fields for issues")
@FeatureFlag("PROJECT")
public class CustomFieldController {

    private final CustomFieldService customFieldService;

    @GetMapping("/projects/{projectId}/custom-fields")
    @Operation(summary = "Get all custom fields for a project")
    public ResponseEntity<List<CustomFieldDto.Response>> getFieldsByProject(
            @PathVariable Long projectId) {
        return ResponseEntity.ok(customFieldService.getFieldsByProject(projectId));
    }

    @PostMapping("/projects/{projectId}/custom-fields")
    @Operation(summary = "Create a new custom field for a project")
    public ResponseEntity<CustomFieldDto.Response> createField(
            @PathVariable Long projectId,
            @Valid @RequestBody CustomFieldDto.CreateRequest request) {
        CustomFieldDto.Response response = customFieldService.createField(projectId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/custom-fields/{fieldId}")
    @Operation(summary = "Update a custom field")
    public ResponseEntity<CustomFieldDto.Response> updateField(
            @PathVariable Long fieldId,
            @Valid @RequestBody CustomFieldDto.UpdateRequest request) {
        return ResponseEntity.ok(customFieldService.updateField(fieldId, request));
    }

    @DeleteMapping("/custom-fields/{fieldId}")
    @Operation(summary = "Delete a custom field (soft delete)")
    public ResponseEntity<Void> deleteField(@PathVariable Long fieldId) {
        customFieldService.deleteField(fieldId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/projects/{projectId}/custom-fields/reorder")
    @Operation(summary = "Reorder custom fields")
    public ResponseEntity<Void> reorderFields(
            @PathVariable Long projectId,
            @RequestBody CustomFieldDto.ReorderRequest request) {
        customFieldService.reorderFields(projectId, request.getFieldIds());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/issues/{issueId}/custom-fields")
    @Operation(summary = "Get all custom field values for an issue")
    public ResponseEntity<List<CustomFieldDto.ValueResponse>> getValuesByIssue(
            @PathVariable Long issueId) {
        return ResponseEntity.ok(customFieldService.getValuesByIssue(issueId));
    }

    @PutMapping("/issues/{issueId}/custom-fields")
    @Operation(summary = "Set custom field values for an issue (batch update)")
    public ResponseEntity<Map<String, String>> setValues(
            @PathVariable Long issueId,
            @RequestBody List<CustomFieldDto.ValueRequest> requests) {
        customFieldService.setValues(issueId, requests);
        return ResponseEntity.ok(Map.of("message", "Custom field values updated successfully"));
    }
}