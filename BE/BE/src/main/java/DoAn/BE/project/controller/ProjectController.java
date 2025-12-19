package DoAn.BE.project.controller;

import DoAn.BE.project.dto.*;
import DoAn.BE.project.entity.ProjectMember.ProjectRole;
import DoAn.BE.project.service.ProjectService;
import DoAn.BE.storage.service.StorageProjectIntegrationService;
import DoAn.BE.storage.service.StorageProjectIntegrationService.ProjectFileStats;
import DoAn.BE.storage.entity.File;
import DoAn.BE.storage.dto.FileDTO;
import DoAn.BE.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {
    
    private final ProjectService projectService;
    private final StorageProjectIntegrationService storageProjectIntegrationService;
    
    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (User) auth.getPrincipal();
    }
    
    @PostMapping
    public ResponseEntity<ProjectDTO> createProject(
            @Valid @RequestBody CreateProjectRequest request) {
        User currentUser = getCurrentUser();
        ProjectDTO project = projectService.createProject(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(project);
    }
    
    @GetMapping("/{projectId}")
    public ResponseEntity<ProjectDTO> getProject(
            @PathVariable Long projectId) {
        User currentUser = getCurrentUser();
        ProjectDTO project = projectService.getProjectById(projectId, currentUser);
        return ResponseEntity.ok(project);
    }
    
    @GetMapping
    public ResponseEntity<List<ProjectDTO>> getAllProjects() {
        User currentUser = getCurrentUser();
        List<ProjectDTO> projects = projectService.getAllProjects(currentUser);
        return ResponseEntity.ok(projects);
    }
    
    @GetMapping("/my-projects")
    public ResponseEntity<List<ProjectDTO>> getMyProjects() {
        User currentUser = getCurrentUser();
        List<ProjectDTO> projects = projectService.getMyProjects(currentUser);
        return ResponseEntity.ok(projects);
    }
    
    @PutMapping("/{projectId}")
    public ResponseEntity<ProjectDTO> updateProject(
            @PathVariable Long projectId,
            @Valid @RequestBody UpdateProjectRequest request) {
        User currentUser = getCurrentUser();
        ProjectDTO project = projectService.updateProject(projectId, request, currentUser.getUserId());
        return ResponseEntity.ok(project);
    }
    
    @DeleteMapping("/{projectId}")
    public ResponseEntity<Void> deleteProject(@PathVariable Long projectId) {
        User currentUser = getCurrentUser();
        projectService.deleteProject(projectId, currentUser.getUserId());
        return ResponseEntity.noContent().build();
    }
    
    // Member management endpoints
    @PostMapping("/{projectId}/members")
    public ResponseEntity<ProjectMemberDTO> addMember(
            @PathVariable Long projectId,
            @Valid @RequestBody AddMemberRequest request) {
        User currentUser = getCurrentUser();
        ProjectMemberDTO member = projectService.addMember(projectId, request, currentUser.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(member);
    }
    
    @GetMapping("/{projectId}/members")
    public ResponseEntity<List<ProjectMemberDTO>> getProjectMembers(@PathVariable Long projectId) {
        User currentUser = getCurrentUser();
        List<ProjectMemberDTO> members = projectService.getProjectMembers(projectId, currentUser.getUserId());
        return ResponseEntity.ok(members);
    }
    
    @DeleteMapping("/{projectId}/members/{memberId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable Long projectId,
            @PathVariable Long memberId) {
        User currentUser = getCurrentUser();
        projectService.removeMember(projectId, memberId, currentUser.getUserId());
        return ResponseEntity.noContent().build();
    }
    
    @PatchMapping("/{projectId}/members/{memberId}/role")
    public ResponseEntity<ProjectMemberDTO> updateMemberRole(
            @PathVariable Long projectId,
            @PathVariable Long memberId,
            @RequestParam ProjectRole role) {
        User currentUser = getCurrentUser();
        ProjectMemberDTO member = projectService.updateMemberRole(projectId, memberId, role, currentUser.getUserId());
        return ResponseEntity.ok(member);
    }
    
    // File management endpoints
    @GetMapping("/{projectId}/files")
    public ResponseEntity<List<FileDTO>> getProjectFiles(@PathVariable Long projectId) {
        List<File> files = storageProjectIntegrationService.getProjectFiles(projectId);
        return ResponseEntity.ok(files.stream()
            .map(this::convertToFileDTO)
            .collect(Collectors.toList()));
    }
    
    @GetMapping("/{projectId}/files/stats")
    public ResponseEntity<ProjectFileStats> getProjectFileStats(@PathVariable Long projectId) {
        return ResponseEntity.ok(storageProjectIntegrationService.getProjectFileStats(projectId));
    }
    
    // Helper method to convert File entity to DTO
    private FileDTO convertToFileDTO(File file) {
        FileDTO dto = new FileDTO();
        dto.setFileId(file.getFileId());
        dto.setFilename(file.getFilename());
        dto.setOriginalFilename(file.getOriginalFilename());
        dto.setFilePath(file.getFilePath());
        dto.setFileSize(file.getFileSize());
        dto.setMimeType(file.getMimeType());
        if (file.getOwner() != null) {
            dto.setOwnerId(file.getOwner().getUserId());
            dto.setOwnerName(file.getOwner().getUsername());
        }
        dto.setCreatedAt(file.getCreatedAt());
        dto.setUpdatedAt(file.getUpdatedAt());
        return dto;
    }
}
