package DoAn.BE.storage.service;

import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.project.repository.ProjectMemberRepository;
import DoAn.BE.storage.dto.FileDTO;
import DoAn.BE.storage.dto.StorageStatsDTO;
import DoAn.BE.storage.entity.File;
import DoAn.BE.storage.entity.Folder;
import DoAn.BE.storage.repository.FileRepository;
import DoAn.BE.storage.repository.FolderRepository;
import DoAn.BE.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

// Read-only queries for storage: file listing, filtering, and storage
// statistics.
// /
@Service
@RequiredArgsConstructor
public class StorageQueryService {

    private final FileRepository fileRepository;
    private final FolderRepository folderRepository;
    private final UserRepository userRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final AccessControlService accessControlService;

    @Value("${app.storage.user-quota-gb:5}")
    private Long userQuotaGB;

    @Value("${app.storage.admin-quota-gb:10}")
    private Long adminQuotaGB;

    @Transactional(readOnly = true)
    public List<FileDTO> getUserFiles(Long userId) {
        return getFiles(userId, "personal");
    }

    @Transactional(readOnly = true)
    public List<FileDTO> getFiles(Long userId, String filter) {
        userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        List<File> files;

        switch (filter.toLowerCase()) {
            case "company":
                files = fileRepository.findByFolder_FolderType(Folder.FolderType.COMPANY);
                break;

            case "project":
                List<Long> userProjectIds = projectMemberRepository.findByUser_UserId(userId)
                        .stream()
                        .map(pm -> pm.getProject().getProjectId())
                        .collect(Collectors.toList());

                if (userProjectIds.isEmpty()) {
                    files = List.of();
                } else {
                    List<Folder> projectFolders = userProjectIds.stream()
                            .flatMap(projectId -> folderRepository.findByProject_ProjectId(projectId).stream())
                            .collect(Collectors.toList());

                    files = projectFolders.stream()
                            .flatMap(folder -> fileRepository.findByFolder_FolderId(folder.getFolderId()).stream())
                            .filter(f -> !f.getIsDeleted())
                            .distinct()
                            .collect(Collectors.toList());
                }
                break;

            case "trash":
                List<File> myDeletedFiles = fileRepository.findByOwner_UserId(userId);

                List<Long> myProjectIds = projectMemberRepository.findByUser_UserId(userId)
                        .stream()
                        .map(pm -> pm.getProject().getProjectId())
                        .collect(Collectors.toList());

                List<File> myProjectFiles = List.of();
                if (!myProjectIds.isEmpty()) {
                    List<Folder> projectsFolders = myProjectIds.stream()
                            .flatMap(pid -> folderRepository.findByProject_ProjectId(pid).stream())
                            .collect(Collectors.toList());

                    myProjectFiles = projectsFolders.stream()
                            .flatMap(f -> fileRepository.findByFolder_FolderId(f.getFolderId()).stream())
                            .collect(Collectors.toList());
                }

                java.util.Set<File> allDeleted = new java.util.HashSet<>();
                allDeleted.addAll(myDeletedFiles);
                allDeleted.addAll(myProjectFiles);

                return allDeleted.stream()
                        .filter(File::getIsDeleted)
                        .map(this::convertToDTO)
                        .sorted((f1, f2) -> f2.getUpdatedAt().compareTo(f1.getUpdatedAt()))
                        .collect(Collectors.toList());

            case "all":
                List<File> personalFiles = fileRepository.findByOwner_UserId(userId);
                List<File> companyFiles = fileRepository.findByFolder_FolderType(Folder.FolderType.COMPANY);

                List<Long> projectIds = projectMemberRepository.findByUser_UserId(userId)
                        .stream()
                        .map(pm -> pm.getProject().getProjectId())
                        .collect(Collectors.toList());

                List<File> projFiles = List.of();
                if (!projectIds.isEmpty()) {
                    List<Folder> projFolders = projectIds.stream()
                            .flatMap(projectId -> folderRepository.findByProject_ProjectId(projectId).stream())
                            .collect(Collectors.toList());

                    projFiles = projFolders.stream()
                            .flatMap(folder -> fileRepository.findByFolder_FolderId(folder.getFolderId()).stream())
                            .filter(f -> !f.getIsDeleted())
                            .collect(Collectors.toList());
                }

                java.util.Set<File> allFilesSet = new java.util.HashSet<>();
                allFilesSet.addAll(personalFiles);
                allFilesSet.addAll(companyFiles);
                allFilesSet.addAll(projFiles);

                return allFilesSet.stream()
                        .filter(f -> !f.getIsDeleted())
                        .map(this::convertToDTO)
                        .sorted((f1, f2) -> f2.getCreatedAt().compareTo(f1.getCreatedAt()))
                        .collect(Collectors.toList());

            case "personal":
            default:
                files = fileRepository.findByOwner_UserId(userId);
                break;
        }

        return files.stream()
                .filter(f -> !f.getIsDeleted())
                .map(this::convertToDTO)
                .sorted((f1, f2) -> f2.getCreatedAt().compareTo(f1.getCreatedAt()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public StorageStatsDTO getStorageStats(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("Không tìm thấy người dùng");
        }

        List<Folder> ownedFolders = folderRepository.findByOwner_UserId(userId);

        List<Long> userProjectIds = projectMemberRepository.findByUser_UserId(userId)
                .stream()
                .map(pm -> pm.getProject().getProjectId())
                .toList();

        List<Folder> projectFolders = userProjectIds.isEmpty()
                ? List.of()
                : userProjectIds.stream()
                        .flatMap(projectId -> folderRepository.findByProject_ProjectId(projectId).stream())
                        .filter(f -> !ownedFolders.contains(f))
                        .toList();

        List<Folder> allFolders = new java.util.ArrayList<>(ownedFolders);
        allFolders.addAll(projectFolders);

        List<File> ownedFiles = fileRepository.findByOwner_UserId(userId);

        List<File> projectFiles = projectFolders.stream()
                .flatMap(folder -> fileRepository.findByFolder_FolderId(folder.getFolderId()).stream())
                .filter(f -> !ownedFiles.contains(f))
                .filter(f -> !f.getIsDeleted())
                .toList();

        List<File> allFiles = new java.util.ArrayList<>(ownedFiles);
        allFiles.addAll(projectFiles);

        long totalFiles = 0;
        long totalFolders = allFolders.size();
        long totalSize = 0;
        Set<String> mimeTypes = new HashSet<>();

        for (File f : allFiles) {
            if (!f.getIsDeleted()) {
                totalFiles++;
                totalSize += f.getFileSize();
                if (f.getMimeType() != null) {
                    mimeTypes.add(f.getMimeType().split("/")[0]);
                } else {
                    mimeTypes.add("unknown");
                }
            }
        }
        long fileTypes = mimeTypes.size();

        long quotaGb = accessControlService.isOwnerOrAdmin() ? adminQuotaGB : userQuotaGB;
        long quotaBytes = quotaGb * 1024L * 1024L * 1024L;
        long remainingQuota = quotaBytes - totalSize;
        double usagePercentage = (double) totalSize / quotaBytes * 100;

        StorageStatsDTO stats = new StorageStatsDTO();
        stats.setTotalFiles(totalFiles);
        stats.setTotalFolders(totalFolders);
        stats.setTotalSize(totalSize);
        stats.setTotalSizeFormatted(formatSize(totalSize));
        stats.setQuotaLimit(quotaBytes);
        stats.setQuotaLimitFormatted(formatSize(quotaBytes));
        stats.setRemainingQuota(remainingQuota);
        stats.setRemainingQuotaFormatted(formatSize(remainingQuota));
        stats.setUsagePercentage(Math.round(usagePercentage * 100.0) / 100.0);
        stats.setFileTypes(fileTypes);

        return stats;
    }

    String formatSize(long bytes) {
        if (bytes == 0)
            return "0 B";

        String[] units = { "B", "KB", "MB", "GB", "TB" };
        int unitIndex = 0;
        double size = bytes;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return String.format("%.2f %s", size, units[unitIndex]);
    }

    private FileDTO convertToDTO(File file) {
        FileDTO dto = new FileDTO();
        dto.setFileId(file.getFileId());
        dto.setFilename(file.getFilename());
        dto.setOriginalFilename(file.getOriginalFilename());
        dto.setFilePath(file.getFilePath());
        dto.setFileSize(file.getFileSize());
        dto.setFileSizeFormatted(file.getFileSizeFormatted());
        dto.setMimeType(file.getMimeType());
        dto.setFileExtension(file.getFileExtension());

        if (file.getFolder() != null) {
            dto.setFolderId(file.getFolder().getFolderId());
            dto.setFolderName(file.getFolder().getName());

            if (file.getFolder().getProject() != null) {
                dto.setProjectId(file.getFolder().getProject().getProjectId());
            }
        }

        dto.setOwnerId(file.getOwner().getUserId());
        dto.setOwnerName(file.getOwner().getUsername());
        dto.setVersion(file.getVersion());
        dto.setIsLatestVersion(file.isLatestVersion());
        dto.setCreatedAt(file.getCreatedAt());
        dto.setUpdatedAt(file.getUpdatedAt());
        dto.setIsImage(file.isImage());
        dto.setIsDocument(file.isDocument());
        dto.setIsVideo(file.isVideo());

        return dto;
    }
}
