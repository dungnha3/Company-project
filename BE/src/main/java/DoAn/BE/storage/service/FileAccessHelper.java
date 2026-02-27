package DoAn.BE.storage.service;

import DoAn.BE.storage.entity.File;
import DoAn.BE.storage.entity.Folder;
import DoAn.BE.project.repository.ProjectMemberRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

// Shared access-check logic for storage operations.
// Used by both FileStorageService (CRUD) and StorageQueryService (read).
// /
@Component
@RequiredArgsConstructor
class FileAccessHelper {

    private final ProjectMemberRepository projectMemberRepository;
    private final UserRepository userRepository;

    boolean canAccessFolder(Folder folder, Long userId) {
        if (folder.getOwner().getUserId().equals(userId)) {
            return true;
        }
        if (folder.isCompanyFolder()) {
            return true;
        }
        if (folder.getFolderType() == Folder.FolderType.PROJECT && folder.getProject() != null) {
            return projectMemberRepository.findByProject_ProjectIdAndUser_UserId(
                    folder.getProject().getProjectId(), userId).isPresent();
        }
        if (folder.getParentFolder() != null) {
            return canAccessFolder(folder.getParentFolder(), userId);
        }
        return false;
    }

    boolean canAccessFile(File file, Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user != null && user.isSystemAdminAccount()) {
            return true;
        }
        if (file.getOwner().getUserId().equals(userId)) {
            return true;
        }
        if (file.getFolder() != null) {
            return canAccessFolder(file.getFolder(), userId);
        }
        return false;
    }
}
