package DoAn.BE.storage.controller;

import DoAn.BE.storage.dto.*;
import DoAn.BE.storage.service.FileStorageService;
import DoAn.BE.storage.service.FolderService;
import DoAn.BE.user.entity.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/storage")
@RequiredArgsConstructor
public class StorageController {

    private final FileStorageService fileStorageService;
    private final FolderService folderService;

    // ==================== FILE ENDPOINTS ====================

    @PostMapping("/files/upload")
    public ResponseEntity<FileUploadResponse> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folderId", required = false) Long folderId,
            Authentication authentication,
            HttpServletRequest request) {
        User user = (User) authentication.getPrincipal();
        Long userId = user.getUserId();
        String ipAddress = getClientIpAddress(request);
        String userAgent = request.getHeader("User-Agent");

        FileUploadResponse response = fileStorageService.uploadFile(file, folderId, userId, ipAddress, userAgent);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/files/{fileId}")
    public ResponseEntity<FileDTO> getFile(
            @PathVariable Long fileId,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        Long userId = user.getUserId();
        FileDTO file = fileStorageService.getFileById(fileId, userId);
        return ResponseEntity.ok(file);
    }

    @GetMapping("/files/{fileId}/download")
    public ResponseEntity<Resource> downloadFile(
            @PathVariable Long fileId,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        Long userId = user.getUserId();
        Resource resource = fileStorageService.downloadFile(fileId, userId);

        // Get file info for content disposition
        FileDTO fileInfo = fileStorageService.getFileById(fileId, userId);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(fileInfo.getMimeType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + fileInfo.getOriginalFilename() + "\"")
                .body(resource);
    }

    @GetMapping("/files/my-files")
    public ResponseEntity<List<FileDTO>> getMyFiles(
            @RequestParam(value = "filter", defaultValue = "personal") String filter,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        Long userId = user.getUserId();
        List<FileDTO> files = fileStorageService.getFiles(userId, filter);
        return ResponseEntity.ok(files);
    }

    @GetMapping("/folders/{folderId}/files")
    public ResponseEntity<List<FileDTO>> getFolderFiles(
            @PathVariable Long folderId,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        Long userId = user.getUserId();
        List<FileDTO> files = fileStorageService.getFolderFiles(folderId, userId);
        return ResponseEntity.ok(files);
    }

    @DeleteMapping("/files/{fileId}")
    public ResponseEntity<Map<String, String>> deleteFile(
            @PathVariable Long fileId,
            @RequestParam(value = "permanent", defaultValue = "false") boolean permanent,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        Long userId = user.getUserId();

        if (permanent) {
            fileStorageService.permanentDeleteFile(fileId, userId);
        } else {
            fileStorageService.deleteFile(fileId, userId);
        }

        Map<String, String> response = new HashMap<>();
        response.put("message", permanent ? "Xóa file vĩnh viễn thành công" : "Xóa file thành công");
        return ResponseEntity.ok(response);
    }

    @PutMapping("/files/{fileId}")
    public ResponseEntity<FileDTO> renameFile(
            @PathVariable Long fileId,
            @RequestParam String name,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        Long userId = user.getUserId();
        FileDTO file = fileStorageService.renameFile(fileId, name, userId);
        return ResponseEntity.ok(file);
    }

    @PutMapping("/files/{fileId}/restore")
    public ResponseEntity<Map<String, String>> restoreFile(
            @PathVariable Long fileId,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        Long userId = user.getUserId();
        fileStorageService.restoreFile(fileId, userId);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Khôi phục file thành công");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/stats")
    public ResponseEntity<StorageStatsDTO> getStorageStats(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        Long userId = user.getUserId();
        StorageStatsDTO stats = fileStorageService.getStorageStats(userId);
        return ResponseEntity.ok(stats);
    }

    // ==================== FOLDER ENDPOINTS ====================

    @PostMapping("/folders")
    public ResponseEntity<FolderDTO> createFolder(
            @Valid @RequestBody CreateFolderRequest request,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        Long userId = user.getUserId();
        FolderDTO folder = folderService.createFolder(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(folder);
    }

    @GetMapping("/folders/{folderId}")
    public ResponseEntity<FolderDTO> getFolder(
            @PathVariable Long folderId,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        Long userId = user.getUserId();
        FolderDTO folder = folderService.getFolderById(folderId, userId);
        return ResponseEntity.ok(folder);
    }

    @GetMapping("/folders/my-folders")
    public ResponseEntity<List<FolderDTO>> getMyFolders(
            @RequestParam(value = "filter", defaultValue = "personal") String filter,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        Long userId = user.getUserId();
        List<FolderDTO> folders = folderService.getFolders(userId, filter);
        return ResponseEntity.ok(folders);
    }

    @GetMapping("/folders/{folderId}/subfolders")
    public ResponseEntity<List<FolderDTO>> getSubFolders(
            @PathVariable Long folderId,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        Long userId = user.getUserId();
        List<FolderDTO> subFolders = folderService.getSubFolders(folderId, userId);
        return ResponseEntity.ok(subFolders);
    }

    @GetMapping("/folders/project/{projectId}")
    public ResponseEntity<List<FolderDTO>> getProjectFolders(
            @PathVariable Long projectId,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        Long userId = user.getUserId();
        List<FolderDTO> folders = folderService.getProjectFolders(projectId, userId);
        return ResponseEntity.ok(folders);
    }

    @PutMapping("/folders/{folderId}")
    public ResponseEntity<FolderDTO> updateFolder(
            @PathVariable Long folderId,
            @RequestParam String name,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        Long userId = user.getUserId();
        FolderDTO folder = folderService.updateFolder(folderId, name, userId);
        return ResponseEntity.ok(folder);
    }

    @DeleteMapping("/folders/{folderId}")
    public ResponseEntity<Map<String, String>> deleteFolder(
            @PathVariable Long folderId,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        Long userId = user.getUserId();
        folderService.deleteFolder(folderId, userId);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Xóa thư mục thành công");
        return ResponseEntity.ok(response);
    }

    // Helper method
    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty() && !"unknown".equalsIgnoreCase(xForwardedFor)) {
            return xForwardedFor.split(",")[0].trim();
        }

        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty() && !"unknown".equalsIgnoreCase(xRealIp)) {
            return xRealIp;
        }

        return request.getRemoteAddr();
    }
}
