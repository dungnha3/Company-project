package DoAn.BE.storage.controller;

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
import DoAn.BE.storage.entity.FileEntity;
import DoAn.BE.storage.repository.FileRepository;
import DoAn.BE.storage.service.GoogleDriveIntegrationService;
import DoAn.BE.user.entity.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
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
    private final String frontendUrl;

    public StorageController(
            GoogleDriveIntegrationService driveService,
            FileRepository fileRepository,
            ProjectRepository projectRepository,
            IssueRepository issueRepository,
            CompanyRepository companyRepository,
            CompanyMemberRepository companyMemberRepository,
            PermissionService permissionService,
            @Value("${app.frontend-url:http://localhost:5173}") String frontendUrl) {
        this.driveService = driveService;
        this.fileRepository = fileRepository;
        this.projectRepository = projectRepository;
        this.issueRepository = issueRepository;
        this.companyRepository = companyRepository;
        this.companyMemberRepository = companyMemberRepository;
        this.permissionService = permissionService;
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
    public ResponseEntity<FileEntity> uploadProjectFile(
            @PathVariable Long projectId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folder", required = false) String folder,
            @AuthenticationPrincipal User user) {
        try {
            Long companyId = TenantContext.getCompanyId();
            if (companyId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

            // Check if user has access to project
            Project project = projectRepository.findById(projectId).orElseThrow();
            CompanyMember member = companyMemberRepository.findActiveMemberWithRoles(user.getUserId(), companyId)
                    .orElse(null);
            if (member == null || !permissionService.hasPermission(member, "STORAGE", "UPLOAD")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            String driveFileId = driveService.uploadFile(companyId, file);

            FileEntity fileEntity = new FileEntity();
            fileEntity.setFileName(file.getOriginalFilename());
            fileEntity.setGoogleDriveFileId(driveFileId);
            fileEntity.setFileSize(file.getSize());
            fileEntity.setContentType(file.getContentType());
            fileEntity.setProject(project);
            fileEntity.setUploadedBy(user);
            fileEntity.setCompany(companyRepository.findById(companyId).orElseThrow());
            fileEntity.setFolder(folder);

            return ResponseEntity.ok(fileRepository.save(fileEntity));
        } catch (Exception e) {
            log.error("Error uploading project file for projectId={}: {}", projectId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/projects/{projectId}/folders")
    public ResponseEntity<FileEntity> createFolder(
            @PathVariable Long projectId,
            @RequestParam("name") String name,
            @RequestParam(value = "folder", required = false) String folder,
            @AuthenticationPrincipal User user) {
        try {
            Long companyId = TenantContext.getCompanyId();
            if (companyId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

            Project project = projectRepository.findById(projectId).orElseThrow();
            CompanyMember member = companyMemberRepository.findActiveMemberWithRoles(user.getUserId(), companyId)
                    .orElse(null);
            if (member == null || !permissionService.hasPermission(member, "STORAGE", "UPLOAD")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            FileEntity folderEntity = new FileEntity();
            folderEntity.setFileName(name);
            folderEntity.setGoogleDriveFileId("folder");
            folderEntity.setFileSize(0L);
            folderEntity.setContentType("folder");
            folderEntity.setProject(project);
            folderEntity.setUploadedBy(user);
            folderEntity.setCompany(companyRepository.findById(companyId).orElseThrow());
            folderEntity.setFolder(folder);

            return ResponseEntity.ok(fileRepository.save(folderEntity));
        } catch (Exception e) {
            log.error("Error creating folder for projectId={}: {}", projectId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/projects/{projectId}/files")
    public ResponseEntity<List<FileEntity>> getProjectFiles(@PathVariable Long projectId, @AuthenticationPrincipal User user) {
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Project project = projectRepository.findById(projectId).orElse(null);
        if (project == null || !project.getCompany().getCompanyId().equals(companyId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        return ResponseEntity.ok(fileRepository.findByProject_ProjectId(projectId));
    }

    @GetMapping("/files/{fileId}/download")
    public ResponseEntity<byte[]> downloadFile(@PathVariable Long fileId, @AuthenticationPrincipal User user) {
        try {
            Long companyId = TenantContext.getCompanyId();
            if (companyId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

            FileEntity file = fileRepository.findById(fileId).orElseThrow();
            if (!file.getCompany().getCompanyId().equals(companyId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            byte[] data = driveService.downloadFile(companyId, file.getGoogleDriveFileId());

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
            if (companyId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

            FileEntity file = fileRepository.findById(fileId).orElseThrow();
            if (!file.getCompany().getCompanyId().equals(companyId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            CompanyMember member = companyMemberRepository.findActiveMemberWithRoles(user.getUserId(), companyId)
                    .orElse(null);
            if (member == null || !permissionService.hasPermission(member, "STORAGE", "DELETE")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            if ("folder".equals(file.getContentType())) {
                // Recursive deletion of subfolders & subfiles
                String folderPath = (file.getFolder() == null || file.getFolder().isEmpty()) 
                        ? file.getFileName() 
                        : file.getFolder() + "/" + file.getFileName();
                List<FileEntity> subFiles = fileRepository.findByProject_ProjectId(file.getProject().getProjectId());
                for (FileEntity sub : subFiles) {
                    if (sub.getFolder() != null && (sub.getFolder().equals(folderPath) || sub.getFolder().startsWith(folderPath + "/"))) {
                        if (!"folder".equals(sub.getContentType())) {
                            try {
                                driveService.deleteFile(companyId, sub.getGoogleDriveFileId());
                            } catch (Exception e) {
                                log.warn("Failed to delete file from Drive: {}", sub.getGoogleDriveFileId(), e);
                            }
                        }
                        fileRepository.delete(sub);
                    }
                }
            } else {
                driveService.deleteFile(companyId, file.getGoogleDriveFileId());
            }
            fileRepository.delete(file);

            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Error deleting file fileId={}: {}", fileId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ==========================================
    // ISSUE FILE MANAGEMENT API
    // ==========================================

    @PostMapping("/issues/{issueId}/upload")
    public ResponseEntity<?> uploadIssueFile(
            @PathVariable Long issueId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User user) {
        try {
            Long companyId = TenantContext.getCompanyId();
            if (companyId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

            CompanyMember member = companyMemberRepository.findActiveMemberWithRoles(user.getUserId(), companyId)
                    .orElse(null);
            if (member == null || !permissionService.hasPermission(member, "STORAGE", "UPLOAD")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            Issue issue = issueRepository.findById(issueId).orElse(null);
            if (issue == null || !issue.getProject().getCompany().getCompanyId().equals(companyId)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }

            String driveFileId = driveService.uploadFile(companyId, file);

            FileEntity fileEntity = new FileEntity();
            fileEntity.setFileName(file.getOriginalFilename());
            fileEntity.setGoogleDriveFileId(driveFileId);
            fileEntity.setFileSize(file.getSize());
            fileEntity.setContentType(file.getContentType());
            fileEntity.setIssue(issue);
            fileEntity.setUploadedBy(user);
            fileEntity.setCompany(companyRepository.findById(companyId).orElseThrow());

            return ResponseEntity.ok(fileRepository.save(fileEntity));
        } catch (Exception e) {
            log.error("Error uploading issue file issueId={}: {}", issueId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Không thể upload file: " + e.getMessage()));
        }
    }

    @GetMapping("/issues/{issueId}/files")
    public ResponseEntity<List<FileEntity>> getIssueFiles(@PathVariable Long issueId, @AuthenticationPrincipal User user) {
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Issue issue = issueRepository.findById(issueId).orElse(null);
        if (issue == null || !issue.getProject().getCompany().getCompanyId().equals(companyId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        return ResponseEntity.ok(fileRepository.findByIssue_IssueIdOrderByCreatedAtDesc(issueId));
    }

    @GetMapping("/files/{fileId}/metadata")
    public ResponseEntity<FileEntity> getFileMetadata(@PathVariable Long fileId) {
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        FileEntity file = fileRepository.findById(fileId).orElse(null);
        if (file == null || !file.getCompany().getCompanyId().equals(companyId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        return ResponseEntity.ok(file);
    }
}
