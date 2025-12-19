package DoAn.BE.storage.service;

import DoAn.BE.common.exception.*;
import DoAn.BE.project.entity.Project;
import DoAn.BE.project.repository.ProjectRepository;
import DoAn.BE.project.repository.ProjectMemberRepository;
import DoAn.BE.storage.dto.CreateFolderRequest;
import DoAn.BE.storage.dto.FolderDTO;
import DoAn.BE.storage.entity.Folder;
import DoAn.BE.storage.repository.FolderRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

// Service quản lý folder (CRUD, tree structure, project integration)
@Service
@RequiredArgsConstructor
@Slf4j
public class FolderService {

    private final FolderRepository folderRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;

    @Transactional
    public FolderDTO createFolder(CreateFolderRequest request, Long userId) {
        // Validate user
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy người dùng"));

        // Validate parent folder if provided
        Folder parentFolder = null;
        if (request.getParentFolderId() != null) {
            parentFolder = folderRepository.findById(request.getParentFolderId())
                    .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy thư mục cha"));

            // Check if user owns the parent folder
            if (!parentFolder.getOwner().getUserId().equals(userId)) {
                throw new ForbiddenException("Bạn không có quyền tạo thư mục con trong thư mục này");
            }
        }

        // Validate project if provided
        Project project = null;
        if (request.getProjectId() != null) {
            project = projectRepository.findById(request.getProjectId())
                    .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy dự án"));
        }

        // Create folder
        Folder folder = new Folder();
        folder.setName(request.getName());
        folder.setParentFolder(parentFolder);
        folder.setOwner(user);
        folder.setFolderType(request.getFolderType() != null ? request.getFolderType() : Folder.FolderType.PERSONAL);
        folder.setProject(project);

        folder = folderRepository.save(folder);
        return convertToDTO(folder);
    }

    @Transactional(readOnly = true)
    public FolderDTO getFolderById(Long folderId, Long userId) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy thư mục"));

        // Check permission: owner OR project member
        if (!canAccessFolder(folder, userId)) {
            throw new ForbiddenException("Bạn không có quyền xem thư mục này");
        }

        return convertToDTO(folder);
    }

    /**
     * Check if user can access folder (owner or project member)
     * Also checks parent folder recursively for subfolders in project folders
     */
    private boolean canAccessFolder(Folder folder, Long userId) {
        // Owner can always access
        if (folder.getOwner().getUserId().equals(userId)) {
            return true;
        }

        // Company folder is accessible by everyone
        if (folder.getFolderType() == Folder.FolderType.COMPANY) {
            return true;
        }

        // If folder is PROJECT type, check if user is project member
        if (folder.getFolderType() == Folder.FolderType.PROJECT && folder.getProject() != null) {
            return projectMemberRepository.findByProject_ProjectIdAndUser_UserId(
                    folder.getProject().getProjectId(), userId).isPresent();
        }

        // ✅ NEW: Check parent folder recursively
        // If this is a subfolder inside a project folder, check parent permission
        if (folder.getParentFolder() != null) {
            return canAccessFolder(folder.getParentFolder(), userId);
        }

        return false;
    }

    @Transactional(readOnly = true)
    public List<FolderDTO> getUserFolders(Long userId) {
        return getFolders(userId, "personal");
    }

    @Transactional(readOnly = true)
    public List<FolderDTO> getFolders(Long userId, String filter) {
        List<Folder> folders;

        switch (filter.toLowerCase()) {
            case "trash":
                return List.of(); // Folders are hard-deleted, so no trash

            case "company":
                folders = folderRepository.findByFolderType(Folder.FolderType.COMPANY);
                break;

            case "project":
                // Get project folders where user is a member
                List<Long> userProjectIds = projectMemberRepository.findByUser_UserId(userId)
                        .stream()
                        .map(pm -> pm.getProject().getProjectId())
                        .toList();

                if (userProjectIds.isEmpty()) {
                    folders = List.of();
                } else {
                    folders = userProjectIds.stream()
                            .flatMap(projectId -> folderRepository.findByProject_ProjectId(projectId).stream())
                            .collect(Collectors.toList());
                }
                break;

            case "all":
                // 1. Personal folders
                List<Folder> ownedFolders = folderRepository.findByOwner_UserId(userId);

                // 2. Company folders
                List<Folder> companyFolders = folderRepository.findByFolderType(Folder.FolderType.COMPANY);

                // 3. Project folders
                List<Long> projectIds = projectMemberRepository.findByUser_UserId(userId)
                        .stream()
                        .map(pm -> pm.getProject().getProjectId())
                        .toList();

                List<Folder> projectFolders = projectIds.isEmpty()
                        ? List.of()
                        : projectIds.stream()
                                .flatMap(projectId -> folderRepository.findByProject_ProjectId(projectId).stream())
                                .collect(Collectors.toList());

                // Combine all
                java.util.Set<Folder> allFoldersSet = new java.util.HashSet<>();
                allFoldersSet.addAll(ownedFolders);
                allFoldersSet.addAll(companyFolders);
                allFoldersSet.addAll(projectFolders);

                return allFoldersSet.stream()
                        .map(this::convertToDTO)
                        .sorted((f1, f2) -> f2.getCreatedAt().compareTo(f1.getCreatedAt()))
                        .collect(Collectors.toList());

            case "personal":
            default:
                folders = folderRepository.findByOwner_UserId(userId);
                break;
        }

        return folders.stream()
                .map(this::convertToDTO)
                .sorted((f1, f2) -> f2.getCreatedAt().compareTo(f1.getCreatedAt()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<FolderDTO> getSubFolders(Long parentFolderId, Long userId) {
        // Validate parent folder
        Folder parentFolder = folderRepository.findById(parentFolderId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy thư mục cha"));

        // Check permission: owner OR project member
        if (!canAccessFolder(parentFolder, userId)) {
            throw new ForbiddenException("Bạn không có quyền xem thư mục này");
        }

        List<Folder> subFolders = folderRepository.findByParentFolder_FolderId(parentFolderId);
        return subFolders.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<FolderDTO> getProjectFolders(Long projectId, Long userId) {
        // Validate project exists
        projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy dự án"));

        // Check if user is project member
        if (projectMemberRepository.findByProject_ProjectIdAndUser_UserId(projectId, userId).isEmpty()) {
            throw new ForbiddenException("Bạn không phải thành viên của dự án này");
        }

        List<Folder> folders = folderRepository.findByProject_ProjectId(projectId);
        return folders.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public FolderDTO updateFolder(Long folderId, String newName, Long userId) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy thư mục"));

        // Check permission: owner OR project member
        if (!canAccessFolder(folder, userId)) {
            throw new ForbiddenException("Bạn không có quyền sửa thư mục này");
        }

        folder.setName(newName);
        folder = folderRepository.save(folder);

        return convertToDTO(folder);
    }

    @Transactional
    public void deleteFolder(Long folderId, Long userId) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy thư mục"));

        // Check permission: owner OR project member
        if (!canAccessFolder(folder, userId)) {
            throw new ForbiddenException("Bạn không có quyền xóa thư mục này");
        }

        folderRepository.delete(folder);
    }

    // Helper methods
    private FolderDTO convertToDTO(Folder folder) {
        FolderDTO dto = new FolderDTO();
        dto.setFolderId(folder.getFolderId());
        dto.setName(folder.getName());
        dto.setFullPath(folder.getFullPath());

        if (folder.getParentFolder() != null) {
            dto.setParentFolderId(folder.getParentFolder().getFolderId());
            dto.setParentFolderName(folder.getParentFolder().getName());
        }

        dto.setOwnerId(folder.getOwner().getUserId());
        dto.setOwnerName(folder.getOwner().getUsername());
        dto.setFolderType(folder.getFolderType());

        if (folder.getProject() != null) {
            dto.setProjectId(folder.getProject().getProjectId());
            dto.setProjectName(folder.getProject().getName());
        }

        dto.setCreatedAt(folder.getCreatedAt());
        dto.setFileCount(folder.getFiles() != null ? folder.getFiles().size() : 0);
        dto.setSubFolderCount(folder.getSubFolders() != null ? folder.getSubFolders().size() : 0);

        return dto;
    }
}
