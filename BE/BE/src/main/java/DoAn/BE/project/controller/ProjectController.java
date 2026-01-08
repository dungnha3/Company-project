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
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

// [Controller quản lý dự án] (Role: Project Members)
@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;
    private final StorageProjectIntegrationService storageProjectIntegrationService;

    // ==================== PROJECT CRUD ====================

    // [Tạo dự án mới] (Role: Authenticated User)
    @PostMapping
    public ResponseEntity<ProjectDTO> createProject(
            @Valid @RequestBody CreateProjectRequest request,
            @AuthenticationPrincipal User currentUser) {
        ProjectDTO project = projectService.createProject(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(project);
    }

    // [Lấy thông tin dự án] (Role: Project Member)
    @GetMapping("/{projectId}")
    public ResponseEntity<ProjectDTO> getProject(
            @PathVariable Long projectId,
            @AuthenticationPrincipal User currentUser) {
        ProjectDTO project = projectService.getProjectById(projectId, currentUser);
        return ResponseEntity.ok(project);
    }

    // [Lấy tất cả dự án mà user có quyền truy cập] (Role: Authenticated User)
    @GetMapping
    public ResponseEntity<List<ProjectDTO>> getAllProjects(@AuthenticationPrincipal User currentUser) {
        List<ProjectDTO> projects = projectService.getAllProjects(currentUser);
        return ResponseEntity.ok(projects);
    }

    // [Lấy các dự án của user] (Role: Authenticated User)
    @GetMapping("/my-projects")
    public ResponseEntity<List<ProjectDTO>> getMyProjects(@AuthenticationPrincipal User currentUser) {
        List<ProjectDTO> projects = projectService.getMyProjects(currentUser);
        return ResponseEntity.ok(projects);
    }

    // [Cập nhật dự án] (Role: Project Owner/Manager)
    @PutMapping("/{projectId}")
    public ResponseEntity<ProjectDTO> updateProject(
            @PathVariable Long projectId,
            @Valid @RequestBody UpdateProjectRequest request,
            @AuthenticationPrincipal User currentUser) {
        ProjectDTO project = projectService.updateProject(projectId, request, currentUser.getUserId());
        return ResponseEntity.ok(project);
    }

    // [Xóa dự án] (Role: Project Owner)
    @DeleteMapping("/{projectId}")
    public ResponseEntity<Void> deleteProject(
            @PathVariable Long projectId,
            @AuthenticationPrincipal User currentUser) {
        projectService.deleteProject(projectId, currentUser.getUserId());
        return ResponseEntity.noContent().build();
    }

    // ==================== MEMBER MANAGEMENT ====================

    // [Thêm thành viên vào dự án] (Role: Project Owner/Manager)
    @PostMapping("/{projectId}/members")
    public ResponseEntity<ProjectMemberDTO> addMember(
            @PathVariable Long projectId,
            @Valid @RequestBody AddMemberRequest request,
            @AuthenticationPrincipal User currentUser) {
        ProjectMemberDTO member = projectService.addMember(projectId, request, currentUser.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(member);
    }

    // [Lấy danh sách thành viên dự án] (Role: Project Member)
    @GetMapping("/{projectId}/members")
    public ResponseEntity<List<ProjectMemberDTO>> getProjectMembers(
            @PathVariable Long projectId,
            @AuthenticationPrincipal User currentUser) {
        List<ProjectMemberDTO> members = projectService.getProjectMembers(projectId, currentUser.getUserId());
        return ResponseEntity.ok(members);
    }

    // [Xóa thành viên khỏi dự án] (Role: Project Owner/Manager)
    @DeleteMapping("/{projectId}/members/{memberId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable Long projectId,
            @PathVariable Long memberId,
            @AuthenticationPrincipal User currentUser) {
        projectService.removeMember(projectId, memberId, currentUser.getUserId());
        return ResponseEntity.noContent().build();
    }

    // [Cập nhật vai trò thành viên] (Role: Project Owner)
    @PatchMapping("/{projectId}/members/{memberId}/role")
    public ResponseEntity<ProjectMemberDTO> updateMemberRole(
            @PathVariable Long projectId,
            @PathVariable Long memberId,
            @RequestParam ProjectRole role,
            @AuthenticationPrincipal User currentUser) {
        ProjectMemberDTO member = projectService.updateMemberRole(projectId, memberId, role, currentUser.getUserId());
        return ResponseEntity.ok(member);
    }

    // ==================== FILE MANAGEMENT ====================

    // [Lấy danh sách file của dự án] (Role: Project Member)
    @GetMapping("/{projectId}/files")
    public ResponseEntity<List<FileDTO>> getProjectFiles(@PathVariable Long projectId) {
        List<File> files = storageProjectIntegrationService.getProjectFiles(projectId);
        return ResponseEntity.ok(files.stream()
                .map(this::convertToFileDTO)
                .collect(Collectors.toList()));
    }

    // [Lấy thống kê file của dự án] (Role: Project Member)
    @GetMapping("/{projectId}/files/stats")
    public ResponseEntity<ProjectFileStats> getProjectFileStats(@PathVariable Long projectId) {
        return ResponseEntity.ok(storageProjectIntegrationService.getProjectFileStats(projectId));
    }

    // [Chuyển đổi File entity sang DTO] (Role: Internal)
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
