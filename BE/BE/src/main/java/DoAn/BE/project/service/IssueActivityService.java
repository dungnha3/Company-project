package DoAn.BE.project.service;

import DoAn.BE.common.exception.*;
import DoAn.BE.common.util.PermissionUtil;
import DoAn.BE.project.dto.IssueActivityDTO;
import DoAn.BE.project.entity.Issue;
import DoAn.BE.project.entity.IssueActivity;
import DoAn.BE.project.entity.IssueActivity.ActivityType;
import DoAn.BE.project.entity.ProjectMember;
import DoAn.BE.project.repository.IssueRepository;
import DoAn.BE.project.repository.IssueActivityRepository;
import DoAn.BE.project.repository.ProjectMemberRepository;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

// Service quản lý lịch sử thay đổi của Issue (activity log)
@Service
@RequiredArgsConstructor
@Slf4j
public class IssueActivityService {

    private final IssueActivityRepository issueActivityRepository;
    private final IssueRepository issueRepository;
    private final ProjectMemberRepository projectMemberRepository;

    @Transactional(readOnly = true)
    public List<IssueActivityDTO> getIssueActivities(Long issueId, User currentUser) {
        if (!PermissionUtil.canAccessProjects(currentUser)) {
            throw new ForbiddenException("Bạn không có quyền truy cập dự án");
        }

        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy issue"));

        if (issue.getProject() == null) {
            throw new IllegalStateException("Issue không có dự án liên kết");
        }

        validateProjectAccess(issue.getProject().getProjectId(), currentUser.getUserId());

        List<IssueActivity> activities = issueActivityRepository.findByIssue_IssueIdOrderByCreatedAtDesc(issueId);
        return activities.stream()
                .map(activity -> convertToDTO(activity, currentUser))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<IssueActivityDTO> getProjectActivities(Long projectId, User currentUser) {
        if (!PermissionUtil.canAccessProjects(currentUser)) {
            throw new ForbiddenException("Bạn không có quyền truy cập dự án");
        }

        validateProjectAccess(projectId, currentUser.getUserId());

        List<IssueActivity> activities = issueActivityRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
        return activities.stream()
                .map(activity -> convertToDTO(activity, currentUser))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<IssueActivityDTO> getUserActivities(Long projectId, User currentUser) {
        if (!PermissionUtil.canAccessProjects(currentUser)) {
            throw new ForbiddenException("Bạn không có quyền truy cập dự án");
        }

        validateProjectAccess(projectId, currentUser.getUserId());

        List<IssueActivity> activities = issueActivityRepository.findByProjectIdAndUserIdOrderByCreatedAtDesc(
                projectId, currentUser.getUserId());
        return activities.stream()
                .map(activity -> convertToDTO(activity, currentUser))
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteActivity(Long activityId, User currentUser) {
        IssueActivity activity = issueActivityRepository.findById(activityId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy activity"));

        if (activity.getIssue() == null || activity.getIssue().getProject() == null) {
            throw new IllegalStateException("Activity không có issue hoặc dự án liên kết");
        }

        Long projectId = activity.getIssue().getProject().getProjectId();
        validateProjectAccess(projectId, currentUser.getUserId());

        // Chỉ Project Manager mới có thể xóa activity log
        boolean isProjectManager = isProjectManager(projectId, currentUser.getUserId());
        if (!activity.canBeDeletedBy(currentUser, isProjectManager)) {
            throw new ForbiddenException("Chỉ Project Manager mới có thể xóa activity log");
        }

        log.info("Project Manager {} xóa activity {} trong project {}",
                currentUser.getUsername(), activityId, projectId);

        issueActivityRepository.delete(activity);
    }

    @Transactional
    public void logActivity(Issue issue, User user, ActivityType activityType, String description) {
        IssueActivity activity = new IssueActivity(issue, user, activityType, description);
        issueActivityRepository.save(activity);
    }

    @Transactional
    public void logFieldChange(Issue issue, User user, ActivityType activityType,
            String fieldName, String oldValue, String newValue) {
        IssueActivity activity = new IssueActivity(issue, user, activityType, fieldName, oldValue, newValue);
        issueActivityRepository.save(activity);
    }

    // Helper methods
    private void validateProjectAccess(Long projectId, Long userId) {
        projectMemberRepository.findByProject_ProjectIdAndUser_UserId(projectId, userId)
                .orElseThrow(() -> new ProjectAccessDeniedException("Bạn không có quyền truy cập dự án này"));
    }

    private boolean isProjectManager(Long projectId, Long userId) {
        return projectMemberRepository.findByProject_ProjectIdAndUser_UserId(projectId, userId)
                .map(ProjectMember::canManageProject)
                .orElse(false);
    }

    private IssueActivityDTO convertToDTO(IssueActivity activity, User currentUser) {
        IssueActivityDTO dto = new IssueActivityDTO();
        dto.setActivityId(activity.getActivityId());

        if (activity.getIssue() != null) {
            dto.setIssueId(activity.getIssue().getIssueId());
            dto.setIssueTitle(activity.getIssue().getTitle());
        }

        if (activity.getUser() != null) {
            dto.setUserId(activity.getUser().getUserId());
            dto.setUserName(activity.getUser().getUsername());
            dto.setUserAvatarUrl(activity.getUser().getAvatarUrl());
        }

        dto.setActivityType(activity.getActivityType());
        dto.setFieldName(activity.getFieldName());
        dto.setOldValue(activity.getOldValue());
        dto.setNewValue(activity.getNewValue());
        dto.setDescription(activity.getDescription());
        dto.setCreatedAt(activity.getCreatedAt());

        if (activity.getIssue() != null && activity.getIssue().getProject() != null) {
            boolean isProjectManager = isProjectManager(activity.getIssue().getProject().getProjectId(),
                    currentUser.getUserId());
            dto.setCanDelete(activity.canBeDeletedBy(currentUser, isProjectManager));
        }

        return dto;
    }
}
