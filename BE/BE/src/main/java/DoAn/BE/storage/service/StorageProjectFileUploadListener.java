package DoAn.BE.storage.service;

import DoAn.BE.project.entity.Project;
import DoAn.BE.project.entity.ProjectMember;
import DoAn.BE.project.repository.ProjectMemberRepository;
import DoAn.BE.project.repository.ProjectRepository;
import DoAn.BE.storage.entity.File;
import DoAn.BE.storage.entity.Folder;
import DoAn.BE.storage.repository.FolderRepository;
import DoAn.BE.notification.service.StorageNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service xử lý notifications khi upload file vào project
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StorageProjectFileUploadListener {
    
    private final FolderRepository folderRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectRepository projectRepository;
    private final StorageNotificationService storageNotificationService;
    
    /**
     * Notify tất cả project members khi có file mới được upload
     */
    @Transactional
    public void notifyProjectMembersOnFileUpload(File file) {
        try {
            // Check if file belongs to a project folder
            Folder folder = file.getFolder();
            if (folder == null || folder.getProject() == null) {
                return; // Not a project file
            }
            
            Project project = folder.getProject();
            String uploaderName = file.getOwner() != null ? file.getOwner().getUsername() : "Unknown";
            
            // Get all project members except the uploader
            List<ProjectMember> members = projectMemberRepository.findByProject_ProjectId(project.getProjectId());
            
            for (ProjectMember member : members) {
                if (member.getUser() != null && 
                    !member.getUser().getUserId().equals(file.getOwner().getUserId())) {
                    
                    // Send notification to each member
                    storageNotificationService.createProjectFileUploadedNotification(
                        member.getUser().getUserId(),
                        uploaderName,
                        file.getOriginalFilename(),
                        project.getProjectId(),
                        project.getName()
                    );
                }
            }
            
            log.info("Notified {} project members about new file: {}", 
                members.size() - 1, file.getOriginalFilename());
                
        } catch (Exception e) {
            log.error("Error notifying project members about file upload: {}", e.getMessage(), e);
        }
    }
}
