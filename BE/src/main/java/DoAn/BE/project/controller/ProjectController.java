package DoAn.BE.project.controller;

import DoAn.BE.project.dto.*;
import DoAn.BE.project.entity.ProjectMember.ProjectRole;
import DoAn.BE.project.service.ProjectService;
import DoAn.BE.project.service.ProjectMemberService;
import DoAn.BE.storage.service.StorageProjectIntegrationService;
import DoAn.BE.storage.service.StorageProjectIntegrationService.ProjectFileStats;
import DoAn.BE.storage.entity.File;
import DoAn.BE.storage.dto.FileDTO;
import DoAn.BE.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import DoAn.BE.common.annotation.FeatureFlag;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
@FeatureFlag("PROJECT")
public class ProjectController {

    private final ProjectService projectService;
    private final ProjectMemberService projectMemberService;
    private final StorageProjectIntegrationService storageProjectIntegrationService;

    @PostMapping
    public ResponseEntity<ProjectDTO> createProject(
            @Valid @RequestBody CreateProjectRequest request,
            @AuthenticationPrincipal User currentUser) {
        ProjectDTO project = projectService.createProject(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(project);
    }

    @GetMapping("/{projectId}")
    @Transactional(readOnly = true)
    public ResponseEntity<ProjectDTO> getProject(
            @PathVariable Long projectId,
            @AuthenticationPrincipal User currentUser) {
        ProjectDTO project = projectService.getProjectById(projectId, currentUser);
        return ResponseEntity.ok(project);
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<Page<ProjectDTO>> getAllProjects(
            @AuthenticationPrincipal User currentUser,
            Pageable pageable) {
        Page<ProjectDTO> projects = projectService.getAllProjectsPaged(currentUser, pageable);
        return ResponseEntity.ok(projects);
    }

    @GetMapping("/my-projects")
    @Transactional(readOnly = true)
    public ResponseEntity<Page<ProjectDTO>> getMyProjects(
            @AuthenticationPrincipal User currentUser,
            Pageable pageable) {
        Page<ProjectDTO> projects = projectService.getMyProjectsPaged(currentUser, pageable);
        return ResponseEntity.ok(projects);
    }

    @PutMapping("/{projectId}")
    public ResponseEntity<ProjectDTO> updateProject(
            @PathVariable Long projectId,
            @Valid @RequestBody UpdateProjectRequest request,
            @AuthenticationPrincipal User currentUser) {
        ProjectDTO project = projectService.updateProject(projectId, request, currentUser.getUserId());
        return ResponseEntity.ok(project);
    }

    @DeleteMapping("/{projectId}")
    public ResponseEntity<Void> deleteProject(
            @PathVariable Long projectId,
            @AuthenticationPrincipal User currentUser) {
        projectService.deleteProject(projectId, currentUser.getUserId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{projectId}/members")
    public ResponseEntity<ProjectMemberDTO> addMember(
            @PathVariable Long projectId,
            @Valid @RequestBody AddMemberRequest request,
            @AuthenticationPrincipal User currentUser) {
        ProjectMemberDTO member = projectMemberService.addMember(projectId, request, currentUser.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(member);
    }

    @GetMapping("/{projectId}/members")
    @Transactional(readOnly = true)
    public ResponseEntity<List<ProjectMemberDTO>> getProjectMembers(
            @PathVariable Long projectId,
            @AuthenticationPrincipal User currentUser) {
        List<ProjectMemberDTO> members = projectMemberService.getProjectMembers(projectId, currentUser.getUserId());
        return ResponseEntity.ok(members);
    }

    @DeleteMapping("/{projectId}/members/{memberId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable Long projectId,
            @PathVariable Long memberId,
            @AuthenticationPrincipal User currentUser) {
        projectMemberService.removeMember(projectId, memberId, currentUser.getUserId());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{projectId}/members/{memberId}/role")
    public ResponseEntity<ProjectMemberDTO> updateMemberRole(
            @PathVariable Long projectId,
            @PathVariable Long memberId,
            @RequestParam ProjectRole role,
            @AuthenticationPrincipal User currentUser) {
        ProjectMemberDTO member = projectMemberService.updateMemberRole(projectId, memberId, role,
                currentUser.getUserId());
        return ResponseEntity.ok(member);
    }

    @GetMapping("/{projectId}/files")
    @Transactional(readOnly = true)
    public ResponseEntity<List<FileDTO>> getProjectFiles(
            @PathVariable Long projectId,
            @AuthenticationPrincipal User currentUser) {
        projectMemberService.validateProjectAccess(projectId, currentUser.getUserId());
        List<File> files = storageProjectIntegrationService.getProjectFiles(projectId);
        return ResponseEntity.ok(files.stream()
                .map(this::convertToFileDTO)
                .collect(Collectors.toList()));
    }

    @GetMapping("/{projectId}/files/stats")
    @Transactional(readOnly = true)
    public ResponseEntity<ProjectFileStats> getProjectFileStats(
            @PathVariable Long projectId,
            @AuthenticationPrincipal User currentUser) {
        projectMemberService.validateProjectAccess(projectId, currentUser.getUserId());
        return ResponseEntity.ok(storageProjectIntegrationService.getProjectFileStats(projectId));
    }

    private FileDTO convertToFileDTO(File file) {
        FileDTO dto = new FileDTO();
        dto.setFileId(file.getFileId());
        dto.setFilename(file.getFilename());
        dto.setOriginalFilename(file.getOriginalFilename());
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
