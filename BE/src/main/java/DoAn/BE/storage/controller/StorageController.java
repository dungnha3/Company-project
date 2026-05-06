package DoAn.BE.storage.controller;

import DoAn.BE.common.context.TenantContext;
import DoAn.BE.common.service.PermissionService;
import DoAn.BE.company.entity.CompanyMember;
import DoAn.BE.company.repository.CompanyRepository;
import DoAn.BE.company.repository.CompanyMemberRepository;
import DoAn.BE.company.entity.Company;
import DoAn.BE.project.entity.Project;
import DoAn.BE.project.repository.ProjectRepository;
import DoAn.BE.storage.entity.FileEntity;
import DoAn.BE.storage.repository.FileRepository;
import DoAn.BE.storage.service.GoogleDriveIntegrationService;
import DoAn.BE.user.entity.User;
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

@RestController
@RequestMapping("/api/storage")
public class StorageController {

    private final GoogleDriveIntegrationService driveService;
    private final FileRepository fileRepository;
    private final ProjectRepository projectRepository;
    private final CompanyRepository companyRepository;
    private final CompanyMemberRepository companyMemberRepository;
    private final PermissionService permissionService;

    public StorageController(GoogleDriveIntegrationService driveService, FileRepository fileRepository,
                             ProjectRepository projectRepository, CompanyRepository companyRepository,
                             CompanyMemberRepository companyMemberRepository, PermissionService permissionService) {
        this.driveService = driveService;
        this.fileRepository = fileRepository;
        this.projectRepository = projectRepository;
        this.companyRepository = companyRepository;
        this.companyMemberRepository = companyMemberRepository;
        this.permissionService = permissionService;
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
            // Redirect back to the frontend settings page after successful connect
            return new RedirectView("http://localhost:5173/app/company/settings?drive_connected=true");
        } catch (Exception e) {
            return new RedirectView("http://localhost:5173/app/company/settings?drive_error=true");
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
            @AuthenticationPrincipal User user) {
        try {
            Long companyId = TenantContext.getCompanyId();
            if (companyId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

            // Check if user has access to project
            Project project = projectRepository.findById(projectId).orElseThrow();
            CompanyMember member = companyMemberRepository.findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(user.getUserId(), companyId)
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

            return ResponseEntity.ok(fileRepository.save(fileEntity));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/projects/{projectId}/files")
    public ResponseEntity<List<FileEntity>> getProjectFiles(@PathVariable Long projectId, @AuthenticationPrincipal User user) {
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

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

            CompanyMember member = companyMemberRepository.findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(user.getUserId(), companyId)
                    .orElse(null);
            if (member == null || !permissionService.hasPermission(member, "STORAGE", "DELETE")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            driveService.deleteFile(companyId, file.getGoogleDriveFileId());
            fileRepository.delete(file);

            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
