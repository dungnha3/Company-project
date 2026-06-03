package DoAn.BE.storage.controller;

import DoAn.BE.audit.entity.AuditLog;
import DoAn.BE.audit.service.AuditLogService;
import DoAn.BE.common.context.TenantContext;
import DoAn.BE.common.service.PermissionService;
import DoAn.BE.company.entity.CompanyMember;
import DoAn.BE.company.repository.CompanyRepository;
import DoAn.BE.company.repository.CompanyMemberRepository;
import DoAn.BE.company.entity.Company;
import DoAn.BE.project.entity.Project;
import DoAn.BE.project.entity.Issue;
import DoAn.BE.project.repository.ProjectRepository;
import DoAn.BE.project.repository.IssueRepository;
import DoAn.BE.storage.dto.FileWithIssueDTO;
import DoAn.BE.storage.dto.FolderNodeDTO;
import DoAn.BE.storage.entity.FileEntity;
import DoAn.BE.storage.repository.FileRepository;
import DoAn.BE.storage.service.GoogleDriveIntegrationService;
import DoAn.BE.user.entity.User;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.servlet.view.RedirectView;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/storage")
@Slf4j
public class StorageController {

    private final GoogleDriveIntegrationService driveService;
    private final FileRepository fileRepository;
    private final ProjectRepository projectRepository;
    private final IssueRepository issueRepository;
    private final CompanyRepository companyRepository;
    private final CompanyMemberRepository companyMemberRepository;
    private final PermissionService permissionService;
    private final AuditLogService auditLogService;
    private final String frontendUrl;

    public StorageController(
            GoogleDriveIntegrationService driveService,
            FileRepository fileRepository,
            ProjectRepository projectRepository,
            IssueRepository issueRepository,
            CompanyRepository companyRepository,
            CompanyMemberRepository companyMemberRepository,
            PermissionService permissionService,
            AuditLogService auditLogService,
            @Value("${app.frontend-url:http://localhost:5173}") String frontendUrl) {
        this.driveService = driveService;
        this.fileRepository = fileRepository;
        this.projectRepository = projectRepository;
        this.issueRepository = issueRepository;
        this.companyRepository = companyRepository;
        this.companyMemberRepository = companyMemberRepository;
        this.permissionService = permissionService;
        this.auditLogService = auditLogService;
        this.frontendUrl = frontendUrl;
    }

    // ==========================================
    // OAUTH INTEGRATION API
    // ==========================================

    @GetMapping("/oauth2/authorize")
    public ResponseEntity<Map<String, String>> authorizeDrive() {
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String url = driveService.getAuthorizationUrl(companyId);
        Map<String, String> response = new HashMap<>();
        response.put("url", url);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/oauth2/callback")
    public RedirectView oauthCallback(@RequestParam("code") String code, @RequestParam("state") String state) {
        try {
            driveService.handleCallback(code, state);
            return new RedirectView(frontendUrl + "/app/company/settings?drive_connected=true");
        } catch (Exception e) {
            log.error("Drive OAuth callback failed", e);
            String errMsg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            try {
                errMsg = java.net.URLEncoder.encode(errMsg, java.nio.charset.StandardCharsets.UTF_8.toString());
            } catch (Exception ex) {
                errMsg = "error";
            }
            return new RedirectView(frontendUrl + "/app/company/settings?drive_error=true&error_message=" + errMsg);
        }
    }

    @DeleteMapping("/disconnect")
    public ResponseEntity<?> disconnectDrive() {
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        driveService.disconnect(companyId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Boolean>> checkStatus() {
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Company company = companyRepository.findById(companyId).orElse(null);
        if (company == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        boolean isConnected = company.getSettings() != null && company.getSettings().getGoogleDriveAccessToken() != null;
        Map<String, Boolean> res = new HashMap<>();
        res.put("connected", isConnected);
        return ResponseEntity.ok(res);
    }

    // ==========================================
    // FILE MANAGEMENT API
    // ==========================================

    @PostMapping("/projects/{projectId}/upload")
    public ResponseEntity<?> uploadProjectFile(
            @PathVariable Long projectId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folder", required = false) String folder,
            @RequestParam(value = "issueId", required = false) Long issueId,
            @AuthenticationPrincipal User user) {
        try {
            Long companyId = TenantContext.getCompanyId();
            if (companyId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("message", "Phiên đăng nhập không hợp lệ"));
            }

            // Validate file (size, type)
            String fileError = validateFile(file);
            if (fileError != null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", fileError));
            }

            Project project = projectRepository.findById(projectId).orElse(null);
            if (project == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "Không tìm thấy dự án"));
            }

            CompanyMember member = companyMemberRepository.findActiveMemberWithRoles(user.getUserId(), companyId)
                    .orElse(null);
            if (member == null || !permissionService.hasPermission(member, "STORAGE", "UPLOAD")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "Bạn không có quyền tải lên tệp tin"));
            }

            Company company = companyRepository.findById(companyId).orElseThrow();
            DoAn.BE.company.entity.CompanySettings settings = company.getSettings();
            if (settings == null || settings.getGoogleDriveAccessToken() == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", "Google Drive chưa được kết nối. Vui lòng kết nối trong phần Cài đặt công ty."));
            }

            // Ensure project has its own Drive folder under SaaS_Storage/
            if (project.getDriveFolderId() == null) {
                String projectFolderId = driveService.getOrCreateFolder(
                        settings, settings.getDriveFolderId(), project.getName());
                project.setDriveFolderId(projectFolderId);
                projectRepository.save(project);
            }

            // Resolve target Drive folder (project root or a virtual subfolder)
            String targetFolderId = project.getDriveFolderId();
            if (folder != null && !folder.isEmpty()) {
                targetFolderId = resolveVirtualFolderToDrive(settings, project, folder);
            }

            String driveFileId = driveService.uploadFileToFolder(settings, targetFolderId, file);

            FileEntity fileEntity = new FileEntity();
            fileEntity.setFileName(file.getOriginalFilename());
            fileEntity.setGoogleDriveFileId(driveFileId);
            fileEntity.setFileSize(file.getSize());
            fileEntity.setContentType(file.getContentType());
            fileEntity.setProject(project);
            fileEntity.setUploadedBy(user);
            fileEntity.setCompany(company);
            fileEntity.setFolder(folder);

            // Link to issue if provided
            if (issueId != null) {
                Issue issue = issueRepository.findById(issueId).orElse(null);
                if (issue != null && issue.getProject().getProjectId().equals(projectId)) {
                    fileEntity.setIssue(issue);
                }
            }

            FileEntity saved = fileRepository.save(fileEntity);

            logStorageAction(user, "STORAGE_UPLOAD_FILE", saved.getId(),
                    Map.of("fileName", saved.getFileName(), "size", saved.getFileSize(),
                            "folder", saved.getFolder() == null ? "" : saved.getFolder(),
                            "issueId", issueId == null ? "" : issueId.toString()),
                    AuditLog.Severity.INFO);

            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            log.error("Error uploading project file for projectId={}: {}", projectId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Không thể tải lên tệp tin: " + e.getMessage()));
        }
    }

    @PostMapping("/projects/{projectId}/folders")
    public ResponseEntity<?> createFolder(
            @PathVariable Long projectId,
            @RequestParam("name") String name,
            @RequestParam(value = "folder", required = false) String folder,
            @RequestParam(value = "issueId", required = false) Long issueId,
            @AuthenticationPrincipal User user) {
        try {
            Long companyId = TenantContext.getCompanyId();
            if (companyId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("message", "Phiên đăng nhập không hợp lệ"));
            }

            // Validate folder name
            String nameError = validateFolderName(name);
            if (nameError != null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", nameError));
            }
            name = name.trim();

            Project project = projectRepository.findById(projectId).orElse(null);
            if (project == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "Không tìm thấy dự án"));
            }

            CompanyMember member = companyMemberRepository.findActiveMemberWithRoles(user.getUserId(), companyId)
                    .orElse(null);
            if (member == null || !permissionService.hasPermission(member, "STORAGE", "UPLOAD")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "Bạn không có quyền tạo thư mục"));
            }

            // Check for duplicate folder name in the same parent location
            boolean duplicateExists;
            if (folder == null || folder.isEmpty()) {
                duplicateExists = fileRepository
                        .findByProject_ProjectIdAndContentTypeAndFolderIsNullAndFileName(projectId, "folder", name)
                        .isPresent();
            } else {
                duplicateExists = fileRepository
                        .findByProject_ProjectIdAndContentTypeAndFolderAndFileName(projectId, "folder", folder, name)
                        .isPresent();
            }
            if (duplicateExists) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("message", "Thư mục \"" + name + "\" đã tồn tại tại vị trí này"));
            }

            Company company = companyRepository.findById(companyId).orElseThrow();
            DoAn.BE.company.entity.CompanySettings settings = company.getSettings();

            String driveFolderEntityId = "folder"; // fallback if Drive not connected

            if (settings != null && settings.getGoogleDriveAccessToken() != null) {
                // Ensure project Drive folder exists
                if (project.getDriveFolderId() == null) {
                    String projectFolderId = driveService.getOrCreateFolder(
                            settings, settings.getDriveFolderId(), project.getName());
                    project.setDriveFolderId(projectFolderId);
                    projectRepository.save(project);
                }

                // Determine parent Drive folder
                String parentDriveFolderId = project.getDriveFolderId();
                if (folder != null && !folder.isEmpty()) {
                    parentDriveFolderId = resolveVirtualFolderToDrive(settings, project, folder);
                }

                // Actually create the folder in Google Drive
                driveFolderEntityId = driveService.getOrCreateFolder(settings, parentDriveFolderId, name);
            }

            FileEntity folderEntity = new FileEntity();
            folderEntity.setFileName(name);
            folderEntity.setGoogleDriveFileId(driveFolderEntityId); // Real Drive folder ID
            folderEntity.setFileSize(0L);
            folderEntity.setContentType("folder");
            folderEntity.setProject(project);
            folderEntity.setUploadedBy(user);
            folderEntity.setCompany(company);
            folderEntity.setFolder(folder);

            // Link to issue if provided
            if (issueId != null) {
                Issue issue = issueRepository.findById(issueId).orElse(null);
                if (issue != null && issue.getProject().getProjectId().equals(projectId)) {
                    folderEntity.setIssue(issue);
                }
            }

            FileEntity saved = fileRepository.save(folderEntity);

            logStorageAction(user, "STORAGE_CREATE_FOLDER", saved.getId(),
                    Map.of("folderName", name, "parentFolder", folder == null ? "" : folder),
                    AuditLog.Severity.INFO);

            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            log.error("Error creating folder for projectId={}: {}", projectId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Không thể tạo thư mục: " + e.getMessage()));
        }
    }

    /**
     * Resolves a virtual folder path (e.g. "Mới" or "Mới/Sub") to its Google Drive folder ID.
     * Lazily creates missing Drive folders and migrates legacy "folder" placeholder IDs.
     */
    private String resolveVirtualFolderToDrive(
            DoAn.BE.company.entity.CompanySettings settings,
            Project project,
            String virtualPath) throws java.io.IOException {

        // Split: "Mới/Sub" → parentPath="Mới", folderName="Sub"
        String parentPath;
        String folderName;
        int lastSlash = virtualPath.lastIndexOf('/');
        if (lastSlash < 0) {
            parentPath = null;
            folderName = virtualPath;
        } else {
            parentPath = virtualPath.substring(0, lastSlash);
            folderName = virtualPath.substring(lastSlash + 1);
        }

        // Look up the virtual folder entity in the database
        java.util.Optional<DoAn.BE.storage.entity.FileEntity> folderEntityOpt;
        if (parentPath == null) {
            folderEntityOpt = fileRepository
                    .findByProject_ProjectIdAndContentTypeAndFolderIsNullAndFileName(
                            project.getProjectId(), "folder", folderName);
        } else {
            folderEntityOpt = fileRepository
                    .findByProject_ProjectIdAndContentTypeAndFolderAndFileName(
                            project.getProjectId(), "folder", parentPath, folderName);
        }

        if (folderEntityOpt.isPresent()) {
            DoAn.BE.storage.entity.FileEntity fe = folderEntityOpt.get();
            // If already has a real Drive folder ID, return it directly
            if (!"folder".equals(fe.getGoogleDriveFileId())) {
                return fe.getGoogleDriveFileId();
            }
            // Legacy entity with placeholder "folder" — create Drive folder lazily and migrate
            String parentDriveId = (parentPath == null)
                    ? project.getDriveFolderId()
                    : resolveVirtualFolderToDrive(settings, project, parentPath);
            String driveFolderId = driveService.getOrCreateFolder(settings, parentDriveId, folderName);
            fe.setGoogleDriveFileId(driveFolderId);
            fileRepository.save(fe);
            return driveFolderId;
        }

        // Virtual folder not found in DB — fall back to project root on Drive
        log.warn("Virtual folder '{}' not found for projectId={}, falling back to project root",
                virtualPath, project.getProjectId());
        return project.getDriveFolderId();
    }

    @GetMapping("/projects/{projectId}/files")
    public ResponseEntity<?> getProjectFiles(@PathVariable Long projectId, @AuthenticationPrincipal User user) {
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Project project = projectRepository.findById(projectId).orElse(null);
        if (project == null || !project.getCompany().getCompanyId().equals(companyId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        CompanyMember member = companyMemberRepository.findActiveMemberWithRoles(user.getUserId(), companyId)
                .orElse(null);
        if (member == null || !permissionService.hasPermission(member, "STORAGE", "VIEW")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Bạn không có quyền xem tệp tin"));
        }

        List<FileWithIssueDTO> result = fileRepository.findByProjectWithIssueGraph(projectId).stream()
                .map(FileWithIssueDTO::fromEntity)
                .collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(result);
    }

    /**
     * Trả về cây folder ảo của project (chỉ các entry có contentType="folder"),
     * dùng cho SubmitTaskModal chọn thư mục con khi nộp file.
     */
    @GetMapping("/projects/{projectId}/folder-tree")
    public ResponseEntity<?> getProjectFolderTree(@PathVariable Long projectId, @AuthenticationPrincipal User user) {
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Project project = projectRepository.findById(projectId).orElse(null);
        if (project == null || !project.getCompany().getCompanyId().equals(companyId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        CompanyMember member = companyMemberRepository.findActiveMemberWithRoles(user.getUserId(), companyId)
                .orElse(null);
        if (member == null || !permissionService.hasPermission(member, "STORAGE", "VIEW")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Bạn không có quyền xem thư mục"));
        }

        List<FileEntity> all = fileRepository.findByProjectWithIssueGraph(projectId);
        // Build tree
        FolderNodeDTO root = FolderNodeDTO.root();
        Map<String, FolderNodeDTO> pathMap = new java.util.HashMap<>();
        pathMap.put("", root);

        for (FileEntity f : all) {
            if (!"folder".equals(f.getContentType())) continue;
            String folder = f.getFolder() == null ? "" : f.getFolder();
            String parent = folder; // parent's path == this folder's `folder` field
            FolderNodeDTO parentNode = pathMap.get(parent);
            if (parentNode == null) {
                // Parent not in map (DB inconsistency) — attach to root
                parentNode = root;
            }
            FolderNodeDTO node = FolderNodeDTO.builder()
                    .name(f.getFileName())
                    .path(parent.isEmpty() ? f.getFileName() : parent + "/" + f.getFileName())
                    .children(new java.util.ArrayList<>())
                    .build();
            parentNode.getChildren().add(node);
            pathMap.put(node.getPath(), node);
        }
        return ResponseEntity.ok(root);
    }

    @GetMapping("/files/{fileId}/download")
    public ResponseEntity<byte[]> downloadFile(@PathVariable Long fileId, @AuthenticationPrincipal User user) {
        try {
            Long companyId = TenantContext.getCompanyId();
            if (companyId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

            CompanyMember member = companyMemberRepository.findActiveMemberWithRoles(user.getUserId(), companyId)
                    .orElse(null);
            if (member == null || !permissionService.hasPermission(member, "STORAGE", "VIEW")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            FileEntity file = fileRepository.findById(fileId).orElseThrow();
            if (!file.getCompany().getCompanyId().equals(companyId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            byte[] data = driveService.downloadFile(companyId, file.getGoogleDriveFileId());

            logStorageAction(user, "STORAGE_DOWNLOAD", file.getId(),
                    Map.of("fileName", file.getFileName(), "fileSize", file.getFileSize() == null ? 0 : file.getFileSize()),
                    AuditLog.Severity.INFO);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(file.getContentType() != null ? file.getContentType() : "application/octet-stream"));
            headers.setContentDispositionFormData("attachment", file.getFileName());

            return new ResponseEntity<>(data, headers, HttpStatus.OK);
        } catch (Exception e) {
            log.error("Error downloading file fileId={}: {}", fileId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/files/{fileId}")
    public ResponseEntity<?> deleteFile(@PathVariable Long fileId, @AuthenticationPrincipal User user) {
        try {
            Long companyId = TenantContext.getCompanyId();
            if (companyId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("message", "Phiên đăng nhập không hợp lệ"));
            }

            FileEntity file = fileRepository.findById(fileId).orElse(null);
            if (file == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "Không tìm thấy tệp tin hoặc thư mục"));
            }
            if (!file.getCompany().getCompanyId().equals(companyId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "Bạn không có quyền truy cập tệp tin này"));
            }

            CompanyMember member = companyMemberRepository.findActiveMemberWithRoles(user.getUserId(), companyId)
                    .orElse(null);
            if (member == null || !permissionService.hasPermission(member, "STORAGE", "DELETE")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "Bạn không có quyền xóa tệp tin"));
            }

            boolean isFolder = "folder".equals(file.getContentType());
            boolean isOwner = file.getUploadedBy() != null
                    && file.getUploadedBy().getUserId().equals(user.getUserId());
            AuditLog.Severity severity = (isFolder || !isOwner) ? AuditLog.Severity.WARNING : AuditLog.Severity.INFO;

            Map<String, Object> oldInfo = Map.of(
                    "fileName", file.getFileName(),
                    "contentType", file.getContentType() == null ? "" : file.getContentType(),
                    "size", file.getFileSize() == null ? 0 : file.getFileSize(),
                    "folder", file.getFolder() == null ? "" : file.getFolder()
            );

            if (isFolder) {
                // Recursively delete all sub-files/sub-folders from Drive and DB
                String folderPath = (file.getFolder() == null || file.getFolder().isEmpty())
                        ? file.getFileName()
                        : file.getFolder() + "/" + file.getFileName();
                List<FileEntity> subFiles = fileRepository.findByProject_ProjectId(file.getProject().getProjectId());
                for (FileEntity sub : subFiles) {
                    if (sub.getFolder() != null
                            && (sub.getFolder().equals(folderPath) || sub.getFolder().startsWith(folderPath + "/"))) {
                        // Delete actual files from Drive (skip placeholder folder entries)
                        if (!"folder".equals(sub.getContentType())) {
                            try {
                                driveService.deleteFile(companyId, sub.getGoogleDriveFileId());
                            } catch (Exception e) {
                                log.warn("Failed to delete sub-file from Drive: {}", sub.getGoogleDriveFileId(), e);
                            }
                        }
                        fileRepository.delete(sub);
                    }
                }
                // Delete the Drive folder itself (if it has a real Drive folder ID)
                if (!"folder".equals(file.getGoogleDriveFileId())) {
                    try {
                        driveService.deleteFile(companyId, file.getGoogleDriveFileId());
                    } catch (Exception e) {
                        log.warn("Failed to delete Drive folder: {}", file.getGoogleDriveFileId(), e);
                    }
                }
            } else {
                driveService.deleteFile(companyId, file.getGoogleDriveFileId());
            }
            fileRepository.delete(file);

            logStorageAction(user, "STORAGE_DELETE", fileId, oldInfo, severity);

            return ResponseEntity.ok(Map.of("message", "Đã xóa thành công"));
        } catch (Exception e) {
            log.error("Error deleting file fileId={}: {}", fileId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Không thể xóa tệp tin: " + e.getMessage()));
        }
    }

    // ==========================================
    // ISSUE FILE MANAGEMENT API
    // ==========================================

    // #region DEBUG c47803 - uploadIssueFile
    @PostMapping("/issues/{issueId}/upload")
    public ResponseEntity<?> uploadIssueFile(
            @PathVariable Long issueId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User user) {
        log.info("[DEBUG-c47803] uploadIssueFile START issueId={}, file={}, size={}", issueId, file.getOriginalFilename(), file.getSize());
        try {
            Long companyId = TenantContext.getCompanyId();
            log.info("[DEBUG-c47803] uploadIssueFile companyId={}", companyId);
            if (companyId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("message", "Phiên đăng nhập không hợp lệ"));
            }

            String fileError = validateFile(file);
            if (fileError != null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", fileError));
            }

            CompanyMember member = companyMemberRepository.findActiveMemberWithRoles(user.getUserId(), companyId)
                    .orElse(null);
            log.info("[DEBUG-c47803] uploadIssueFile member={}, hasPermission={}", member != null ? member.getId() : null, member != null ? permissionService.hasPermission(member, "STORAGE", "UPLOAD") : null);
            if (member == null || !permissionService.hasPermission(member, "STORAGE", "UPLOAD")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "Bạn không có quyền tải lên tệp tin"));
            }

            Issue issue = null;
            try {
                issue = issueRepository.findById(issueId).orElse(null);
                log.info("[DEBUG-c47803] uploadIssueFile issue lookup: found={}", issue != null);
            } catch (Exception ex) {
                log.error("[DEBUG-c47803] uploadIssueFile issue lookup EX: {}", ex.getMessage(), ex);
            }
            if (issue == null || !issue.getProject().getCompany().getCompanyId().equals(companyId)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "Không tìm thấy nhiệm vụ"));
            }

            log.info("[DEBUG-c47803] uploadIssueFile calling driveService.uploadFile...");
            String driveFileId = driveService.uploadFile(companyId, file);
            log.info("[DEBUG-c47803] uploadIssueFile driveFileId={}", driveFileId);

            FileEntity fileEntity = new FileEntity();
            fileEntity.setFileName(file.getOriginalFilename());
            fileEntity.setGoogleDriveFileId(driveFileId);
            fileEntity.setFileSize(file.getSize());
            fileEntity.setContentType(file.getContentType());
            fileEntity.setIssue(issue);
            fileEntity.setProject(issue.getProject());
            fileEntity.setUploadedBy(user);
            log.info("[DEBUG-c47803] uploadIssueFile companyIdToSet={}", companyId);
            fileEntity.setCompany(companyRepository.findById(companyId).orElseThrow(() -> new RuntimeException("Company not found: " + companyId)));

            log.info("[DEBUG-c47803] uploadIssueFile saving entity...");
            FileEntity saved = fileRepository.save(fileEntity);
            log.info("[DEBUG-c47803] uploadIssueFile SUCCESS savedId={}", saved.getId());

            logStorageAction(user, "STORAGE_UPLOAD_ISSUE_FILE", saved.getId(),
                    Map.of("fileName", saved.getFileName(),
                            "size", saved.getFileSize() == null ? 0 : saved.getFileSize(),
                            "issueId", String.valueOf(issueId),
                            "projectId", String.valueOf(issue.getProject().getProjectId())),
                    AuditLog.Severity.INFO);

            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            log.error("[DEBUG-c47803] uploadIssueFile EXCEPTION: {} | {}", e.getClass().getName(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Không thể tải lên tệp tin: " + e.getMessage()));
        }
    }
    // #endregion

    // #region DEBUG c47803 - getIssueFiles
    @GetMapping("/issues/{issueId}/files")
    public ResponseEntity<?> getIssueFiles(@PathVariable Long issueId, @AuthenticationPrincipal User user) {
        log.info("[DEBUG-c47803] getIssueFiles START issueId={}", issueId);
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null) {
            log.warn("[DEBUG-c47803] getIssueFiles FAIL: no companyId");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // Dùng query có JOIN FETCH project+company để tránh LazyInitializationException
        Issue issue = issueRepository.findByIdWithProjectAndCompany(issueId).orElse(null);
        log.info("[DEBUG-c47803] getIssueFiles issue lookup: id={}, found={}, projectCompanyId={}",
                issueId, issue != null, issue != null ? issue.getProject().getCompany().getCompanyId() : null);

        if (issue == null || !issue.getProject().getCompany().getCompanyId().equals(companyId)) {
            log.warn("[DEBUG-c47803] getIssueFiles FAIL: issue not found or wrong company");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        CompanyMember member = companyMemberRepository.findActiveMemberWithRoles(user.getUserId(), companyId)
                .orElse(null);
        if (member == null || !permissionService.hasPermission(member, "STORAGE", "VIEW")) {
            log.warn("[DEBUG-c47803] getIssueFiles FAIL: no permission");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        List<FileEntity> files = fileRepository.findByIssue_IssueIdOrderByCreatedAtDesc(issueId);
        log.info("[DEBUG-c47803] getIssueFiles SUCCESS: found {} files for issueId={}", files.size(), issueId);

        return ResponseEntity.ok(files);
    }
    // #endregion

    @GetMapping("/files/{fileId}/metadata")
    public ResponseEntity<?> getFileMetadata(@PathVariable Long fileId, @AuthenticationPrincipal User user) {
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        CompanyMember member = companyMemberRepository.findActiveMemberWithRoles(user.getUserId(), companyId)
                .orElse(null);
        if (member == null || !permissionService.hasPermission(member, "STORAGE", "VIEW")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        FileEntity file = fileRepository.findById(fileId).orElse(null);
        if (file == null || !file.getCompany().getCompanyId().equals(companyId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        return ResponseEntity.ok(file);
    }

    // ==========================================
    // VALIDATION HELPERS
    // ==========================================

    /**
     * Validates an uploaded file for size and dangerous extension constraints.
     * @return null nếu hợp lệ, chuỗi thông báo lỗi nếu không hợp lệ
     */
    private String validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return "Tệp tin không được để trống";
        }
        // Giới hạn kích thước: 50MB
        final long MAX_SIZE = 50L * 1024 * 1024;
        if (file.getSize() > MAX_SIZE) {
            return String.format("Kích thước tệp tin vượt quá giới hạn cho phép (tối đa 50MB, hiện tại: %.1fMB)",
                    file.getSize() / (1024.0 * 1024.0));
        }
        // Chặn các loại file nguy hiểm
        String originalFilename = file.getOriginalFilename();
        if (originalFilename != null) {
            String nameLower = originalFilename.toLowerCase();
            String[] blockedExts = {".exe", ".bat", ".cmd", ".sh", ".msi", ".dll",
                    ".vbs", ".ps1", ".pif", ".scr", ".com", ".hta", ".jar"};
            for (String ext : blockedExts) {
                if (nameLower.endsWith(ext)) {
                    return "Loại tệp tin không được phép tải lên: " + ext;
                }
            }
        }
        return null;
    }

    /**
     * Validates a folder name for illegal characters and length.
     * @return null nếu hợp lệ, chuỗi thông báo lỗi nếu không hợp lệ
     */
    private String validateFolderName(String name) {
        if (name == null || name.trim().isEmpty()) {
            return "Tên thư mục không được để trống";
        }
        if (name.trim().length() > 100) {
            return "Tên thư mục không được vượt quá 100 ký tự";
        }
        // Các ký tự không hợp lệ trong tên thư mục
        char[] illegalChars = {'/', '\\', ':', '*', '?', '"', '<', '>', '|'};
        for (char c : illegalChars) {
            if (name.indexOf(c) >= 0) {
                return "Tên thư mục không được chứa ký tự đặc biệt: / \\ : * ? \" < > |";
            }
        }
        return null;
    }

    /**
     * Ghi audit log cho thao tác storage. Best-effort, lỗi log không làm fail request.
     */
    private void logStorageAction(User user, String action, Long entityId,
                                  Object newValue, AuditLog.Severity severity) {
        try {
            HttpServletRequest req = currentRequest();
            String ip = req != null ? extractClientIp(req) : null;
            String ua = req != null ? req.getHeader("User-Agent") : null;
            auditLogService.logAction(
                    user != null ? user.getUserId() : null,
                    action,
                    action.startsWith("STORAGE_CREATE_FOLDER") ? "FOLDER" : "FILE",
                    entityId,
                    null,
                    newValue,
                    severity,
                    ip,
                    ua);
        } catch (Exception e) {
            log.warn("Failed to write storage audit log: {}", e.getMessage());
        }
    }

    private HttpServletRequest currentRequest() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes)
                    RequestContextHolder.currentRequestAttributes();
            return attrs.getRequest();
        } catch (Exception e) {
            return null;
        }
    }

    private String extractClientIp(HttpServletRequest req) {
        String h = req.getHeader("X-Forwarded-For");
        if (h != null && !h.isEmpty()) {
            return h.split(",")[0].trim();
        }
        return req.getRemoteAddr();
    }
}
