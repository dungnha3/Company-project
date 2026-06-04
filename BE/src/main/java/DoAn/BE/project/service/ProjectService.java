package DoAn.BE.project.service;

import DoAn.BE.common.exception.*;
import DoAn.BE.common.service.AccessControlService;


import lombok.extern.slf4j.Slf4j;
import DoAn.BE.project.dto.*;
import DoAn.BE.project.entity.Project;
import DoAn.BE.project.entity.Project.ProjectStatus;
import DoAn.BE.project.entity.ProjectMember;
import DoAn.BE.project.entity.ProjectMember.ProjectRole;
import DoAn.BE.project.repository.IssueRepository;
import DoAn.BE.project.repository.IssueStatusRepository;
import DoAn.BE.project.repository.ProjectMemberRepository;
import DoAn.BE.project.repository.ProjectRepository;
import DoAn.BE.project.repository.SprintRepository;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.stream.Collectors;

// Member operations delegated to ProjectMemberService
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final AccessControlService accessControlService;
    private final SprintRepository sprintRepository;
    private final IssueRepository issueRepository;
    private final IssueStatusRepository issueStatusRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final DoAn.BE.storage.service.GoogleDriveIntegrationService driveService;

    @Transactional
    public ProjectDTO createProject(CreateProjectRequest request, User currentUser) {
        // [Granular Permission] Kiểm tra quyền tạo dự án
        accessControlService.checkProjectCreatePermission();

        // [SAAS] Kiểm tra giới hạn gói cước


        log.info("User {} tạo dự án mới: {}", currentUser.getUsername(), request.getName());

        String key = request.getKeyProject();
        if (key == null || key.trim().isEmpty()) {
            key = generateProjectKey(request.getName());
            request.setKeyProject(key);
        }

        if (projectRepository.findByKeyProject(request.getKeyProject()).isPresent()) {
            throw new DuplicateException("Mã dự án đã tồn tại: " + request.getKeyProject());
        }


        // Validate dates
        if (request.getStartDate() != null && request.getEndDate() != null) {
            if (request.getEndDate().isBefore(request.getStartDate())) {
                throw new BadRequestException("Ngày kết thúc phải sau ngày bắt đầu");
            }
        }
        Project project = new Project();
        project.setName(request.getName());
        project.setKeyProject(request.getKeyProject());
        project.setDescription(request.getDescription());
        project.setStartDate(request.getStartDate());
        project.setEndDate(request.getEndDate());
        project.setCreatedBy(currentUser);

        project.setStatus(Project.ProjectStatus.ACTIVE);
        project.setIsActive(true);

        project = projectRepository.save(project);

        // Add creator as OWNER
        ProjectMember ownerMember = new ProjectMember(project, currentUser, ProjectRole.OWNER);
        projectMemberRepository.save(ownerMember);

        // Tạo thư mục Drive ngay khi tạo dự án (nếu Drive đã kết nối)
        try {
            Long companyId = DoAn.BE.common.context.TenantContext.getCompanyId();
            if (companyId != null) {
                DoAn.BE.company.entity.CompanySettings settings = driveService.getCompanySettingsSafe(companyId);
                if (settings != null
                        && settings.getGoogleDriveAccessToken() != null
                        && settings.getDriveFolderId() != null) {
                    String projectFolderId = driveService.getOrCreateFolder(
                            settings, settings.getDriveFolderId(), project.getName());
                    project.setDriveFolderId(projectFolderId);
                    projectRepository.save(project);
                    log.info("Đã tạo thư mục Drive cho dự án '{}': {}", project.getName(), projectFolderId);
                }
            }
        } catch (Exception e) {
            // Non-fatal: thư mục Drive sẽ được tạo lazily lần đầu upload/tạo folder
            log.warn("Không thể tạo thư mục Drive cho dự án '{}': {}", project.getName(), e.getMessage());
        }
        ProjectDTO projectDTO = convertToDTO(project);

        // Publish Event
        eventPublisher.publishEvent(new DoAn.BE.project.event.ProjectEvent(this,
                DoAn.BE.project.event.ProjectEvent.Type.CREATED, projectDTO, currentUser.getUserId()));

        return projectDTO;
    }

    @Transactional(readOnly = true)
    public ProjectDTO getProjectById(Long projectId, User currentUser) {
        // Admin và HR/Accounting không có quyền
        if (!accessControlService.canAccessProjects(currentUser)) {
            throw new ForbiddenException("Bạn không có quyền truy cập dự án");
        }

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dự án"));
        if (project.getIsActive() != null && !project.getIsActive()) {
            throw new ResourceNotFoundException("Dự án đã bị xóa");
        }

        // Kiểm tra xem user có quyền truy cập dự án này không
        validateProjectAccess(projectId, currentUser.getUserId());

        return convertToDTO(project);
    }

    @Transactional(readOnly = true)
    public List<ProjectDTO> getAllProjects(User currentUser) {
        // Kiểm tra quyền truy cập dự án
        if (!accessControlService.canAccessProjects(currentUser)) {
            throw new ForbiddenException("Bạn không có quyền truy cập dự án");
        }

        // Tất cả user đều xem dự án mình tham gia
        return getMyProjects(currentUser.getUserId());
    }

    @Transactional(readOnly = true)
    public Page<ProjectDTO> getAllProjectsPaged(User currentUser, Pageable pageable) {
        // Kiểm tra quyền truy cập dự án
        if (!accessControlService.canAccessProjects(currentUser)) {
            throw new ForbiddenException("Bạn không có quyền truy cập dự án");
        }

        // Tất cả user đều xem dự án mình tham gia
        return getMyProjectsPaged(currentUser.getUserId(), pageable);
    }

    @Transactional(readOnly = true)
    public List<ProjectDTO> getMyProjects(Long userId) {
        List<ProjectMember> memberships = projectMemberRepository.findByUser_UserId(userId);
        return memberships.stream()
                .map(member -> member.getProject())
                .filter(p -> p.getIsActive() != null && p.getIsActive() && p.getStatus() != Project.ProjectStatus.CANCELLED)
                .distinct()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<ProjectDTO> getMyProjectsPaged(Long userId, Pageable pageable) {
        List<ProjectMember> allMemberships = projectMemberRepository.findByUser_UserId(userId);
        List<Project> uniqueProjects = allMemberships.stream()
                .map(ProjectMember::getProject)
                .filter(p -> p.getIsActive() != null && p.getIsActive() && p.getStatus() != Project.ProjectStatus.CANCELLED)
                .distinct()
                .collect(Collectors.toList());
        long total = uniqueProjects.size();
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), uniqueProjects.size());
        List<ProjectDTO> pageContent = start >= uniqueProjects.size() ? Collections.emptyList()
                : uniqueProjects.subList(start, end).stream().map(this::convertToDTO).collect(Collectors.toList());
        return new org.springframework.data.domain.PageImpl<>(pageContent, pageable, total);
    }

    @Transactional(readOnly = true)
    public List<ProjectDTO> getMyProjects(User currentUser) {
        // Admin và HR/Accounting không có quyền
        if (!accessControlService.canAccessProjects(currentUser)) {
            throw new ForbiddenException("Bạn không có quyền truy cập dự án");
        }

        return getMyProjects(currentUser.getUserId());
    }

    @Transactional(readOnly = true)
    public Page<ProjectDTO> getMyProjectsPaged(User currentUser, Pageable pageable) {
        // Admin và HR/Accounting không có quyền
        if (!accessControlService.canAccessProjects(currentUser)) {
            throw new ForbiddenException("Bạn không có quyền truy cập dự án");
        }

        return getMyProjectsPaged(currentUser.getUserId(), pageable);
    }

    @Transactional
    public ProjectDTO updateProject(Long projectId, UpdateProjectRequest request, Long userId) {
        accessControlService.checkProjectManageAllPermission();
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dự án"));

        // Kiểm tra quyền quản lý dự án
        validateProjectManagement(projectId, userId);

        // Cập nhật các trường thông tin
        if (request.getName() != null) {
            project.setName(request.getName());
        }
        if (request.getDescription() != null) {
            project.setDescription(request.getDescription());
        }
        if (request.getStatus() != null) {
            Project.ProjectStatus oldStatus = project.getStatus();
            project.setStatus(request.getStatus());

            if (oldStatus != request.getStatus()) {
                // Publish Event for Status Changed or Completed
                DoAn.BE.project.event.ProjectEvent.Type eventType = request
                        .getStatus() == Project.ProjectStatus.COMPLETED
                                ? DoAn.BE.project.event.ProjectEvent.Type.COMPLETED
                                : DoAn.BE.project.event.ProjectEvent.Type.STATUS_CHANGED;

                eventPublisher.publishEvent(new DoAn.BE.project.event.ProjectEvent(this,
                        eventType,
                        convertToDTO(project),
                        userId));
            }
        }
        if (request.getStartDate() != null) {
            project.setStartDate(request.getStartDate());
        }
        if (request.getEndDate() != null) {
            project.setEndDate(request.getEndDate());
        }


        // Validate ngày tháng
        if (project.getStartDate() != null && project.getEndDate() != null) {
            if (project.getEndDate().isBefore(project.getStartDate())) {
                throw new BadRequestException("Ngày kết thúc phải sau ngày bắt đầu");
            }
        }

        project = projectRepository.save(project);
        ProjectDTO projectDTO = convertToDTO(project);

        // Publish Event
        eventPublisher.publishEvent(new DoAn.BE.project.event.ProjectEvent(this,
                DoAn.BE.project.event.ProjectEvent.Type.UPDATED, projectDTO, userId));

        return projectDTO;
    }

    @Transactional
    public void deleteProject(Long projectId, Long userId) {
        accessControlService.checkProjectDeletePermission();
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dự án"));

        // Chỉ OWNER mới được xóa dự án
        ProjectMember member = projectMemberRepository.findByProject_ProjectIdAndUser_UserId(projectId, userId)
                .orElseThrow(() -> new ProjectAccessDeniedException("Bạn không có quyền truy cập dự án này"));

        if (!member.isOwner()) {
            throw new ForbiddenException("Chỉ chủ dự án mới có thể xóa dự án");
        }

        // Xóa mềm (Soft delete)
        project.setIsActive(false);
        project.setStatus(ProjectStatus.CANCELLED); // Set status to CANCELLED as well
        projectRepository.save(project);



        // --- CASCADE SOFT DELETE LOGIC ---
        // 1. Cancel active Sprints
        sprintRepository.updateStatusByProjectId(projectId, DoAn.BE.project.entity.Sprint.SprintStatus.CANCELLED);

        // 2. Mark Issues as "Cancelled" (or Done if Cancelled doesn't exist)
        DoAn.BE.project.entity.IssueStatus cancelledStatus = issueStatusRepository.findByName("Cancelled")
                .orElseGet(() -> {
                    // Create if not exists
                    DoAn.BE.project.entity.IssueStatus newStatus = new DoAn.BE.project.entity.IssueStatus();
                    newStatus.setName("Cancelled");
                    newStatus.setColor("#808080"); // Grey
                    newStatus.setOrderIndex(99);
                    return issueStatusRepository.save(newStatus);
                });
        issueRepository.updateStatusByProjectId(projectId, cancelledStatus);

        // Publish Event
        eventPublisher.publishEvent(new DoAn.BE.project.event.ProjectEvent(this,
                DoAn.BE.project.event.ProjectEvent.Type.DELETED, convertToDTO(project), userId));
    }

    private void validateProjectAccess(Long projectId, Long userId) {
        projectMemberRepository.findByProject_ProjectIdAndUser_UserId(projectId, userId)
                .orElseThrow(() -> new ProjectAccessDeniedException("Bạn không có quyền truy cập dự án này"));
    }

    private void validateProjectManagement(Long projectId, Long userId) {
        ProjectMember member = projectMemberRepository.findByProject_ProjectIdAndUser_UserId(projectId, userId)
                .orElseThrow(() -> new ProjectAccessDeniedException("Bạn không có quyền truy cập dự án này"));

        if (!member.canManageProject()) {
            throw new ForbiddenException("Bạn không có quyền quản lý dự án này");
        }
    }

    private ProjectDTO convertToDTO(Project project) {
        ProjectDTO dto = new ProjectDTO();
        dto.setProjectId(project.getProjectId());
        dto.setName(project.getName());
        dto.setKeyProject(project.getKeyProject());
        dto.setDescription(project.getDescription());
        dto.setStatus(project.getStatus());
        dto.setStartDate(project.getStartDate());
        dto.setEndDate(project.getEndDate());

        if (project.getCreatedBy() != null) {
            dto.setCreatedBy(project.getCreatedBy().getUserId());
            dto.setCreatedByName(project.getCreatedBy().getUsername());
        }



        // Tính tiến độ dự án dựa trên số issue đã hoàn thành
        if (project.getProjectId() != null) {
            long totalIssues = issueRepository.countByProject_ProjectId(project.getProjectId());
            if (totalIssues > 0) {
                long completedIssues = issueRepository.countCompletedByProject(project.getProjectId());
                dto.setProgress((int) ((completedIssues * 100) / totalIssues));
            } else {
                dto.setProgress(0);
            }
        }

        return dto;
    }

    private String generateProjectKey(String name) {
        if (name == null || name.trim().isEmpty()) return "PROJ";
        String[] words = name.trim().split("\\s+");
        StringBuilder keyBuilder = new StringBuilder();
        if (words.length == 1) {
            keyBuilder.append(words[0].substring(0, Math.min(3, words[0].length())).toUpperCase());
        } else {
            for (String word : words) {
                if (!word.isEmpty() && Character.isLetterOrDigit(word.charAt(0))) {
                    keyBuilder.append(Character.toUpperCase(word.charAt(0)));
                }
            }
        }
        String baseKey = keyBuilder.toString();
        if (baseKey.isEmpty()) baseKey = "PROJ";
        if (baseKey.length() > 10) baseKey = baseKey.substring(0, 10);
        
        String key = baseKey;
        int counter = 1;
        while (projectRepository.findByKeyProject(key).isPresent()) {
            key = baseKey + "-" + counter;
            counter++;
        }
        return key;
    }
}
