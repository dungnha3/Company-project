package DoAn.BE.project.service;

import DoAn.BE.common.exception.*;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.project.dto.*;
import DoAn.BE.project.entity.Issue;
import DoAn.BE.project.entity.IssueComment;
import DoAn.BE.project.entity.IssueActivity;
import DoAn.BE.project.entity.IssueActivity.ActivityType;
import DoAn.BE.project.entity.ProjectMember;
import DoAn.BE.project.repository.IssueRepository;
import DoAn.BE.project.repository.IssueCommentRepository;
import DoAn.BE.project.repository.IssueActivityRepository;
import DoAn.BE.project.repository.ProjectMemberRepository;
import DoAn.BE.user.entity.User;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class IssueCommentService {

    private final IssueCommentRepository issueCommentRepository;
    private final IssueRepository issueRepository;
    private final IssueActivityRepository issueActivityRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;
    private final AccessControlService accessControlService;

    @Transactional
    public IssueCommentDTO createComment(CreateCommentRequest request, User currentUser) {
        // Kiểm tra quyền truy cập project
        if (!accessControlService.canAccessProjects(currentUser)) {
            throw new ForbiddenException("Bạn không có quyền truy cập dự án");
        }

        log.info("User {} tạo comment cho issue {}", currentUser.getUsername(), request.getIssueId());
        Issue issue = issueRepository.findById(request.getIssueId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy issue"));

        if (issue.getProject() == null) {
            throw new IllegalStateException("Issue không có dự án liên kết");
        }

        validateProjectAccess(issue.getProject().getProjectId(), currentUser.getUserId());
        IssueComment comment = new IssueComment(issue, currentUser, request.getContent());
        comment = issueCommentRepository.save(comment);

        // Log activity
        IssueActivity activity = new IssueActivity(issue, currentUser, ActivityType.COMMENT_ADDED,
                "đã thêm comment");
        issueActivityRepository.save(activity);

        // Publish Event for Comment Added
        eventPublisher.publishEvent(new DoAn.BE.project.event.IssueEvent(this, issue,
                DoAn.BE.project.event.IssueEvent.EventType.COMMENT_ADDED, currentUser.getUserId()));

        return convertToDTO(comment, currentUser);
    }

    @Transactional(readOnly = true)
    public List<IssueCommentDTO> getIssueComments(Long issueId, User currentUser) {
        if (!accessControlService.canAccessProjects(currentUser)) {
            throw new ForbiddenException("Bạn không có quyền truy cập dự án");
        }

        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy issue"));

        if (issue.getProject() == null) {
            throw new IllegalStateException("Issue không có dự án liên kết");
        }

        validateProjectAccess(issue.getProject().getProjectId(), currentUser.getUserId());

        List<IssueComment> comments = issueCommentRepository.findByIssue_IssueIdOrderByCreatedAtAsc(issueId);
        return comments.stream()
                .map(comment -> convertToDTO(comment, currentUser))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<IssueCommentDTO> getIssueCommentsPaged(Long issueId, User currentUser,
            org.springframework.data.domain.Pageable pageable) {
        if (!accessControlService.canAccessProjects(currentUser)) {
            throw new ForbiddenException("Bạn không có quyền truy cập dự án");
        }

        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy issue"));

        if (issue.getProject() == null) {
            throw new IllegalStateException("Issue không có dự án liên kết");
        }

        validateProjectAccess(issue.getProject().getProjectId(), currentUser.getUserId());

        org.springframework.data.domain.Page<IssueComment> comments = issueCommentRepository
                .findByIssue_IssueIdOrderByCreatedAtAsc(issueId, pageable);
        return comments.map(comment -> convertToDTO(comment, currentUser));
    }

    @Transactional
    public IssueCommentDTO updateComment(Long commentId, String newContent, User currentUser) {
        IssueComment comment = issueCommentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy comment"));

        // Kiểm tra quyền sửa comment (chỉ author)
        if (!comment.canBeEditedBy(currentUser)) {
            throw new ForbiddenException("Bạn chỉ có thể sửa comment của mình");
        }

        if (comment.getIssue() == null || comment.getIssue().getProject() == null) {
            throw new IllegalStateException("Comment không có issue hoặc dự án liên kết");
        }

        validateProjectAccess(comment.getIssue().getProject().getProjectId(), currentUser.getUserId());

        comment.setContent(newContent);
        comment = issueCommentRepository.save(comment);

        // Log activity
        IssueActivity activity = new IssueActivity(comment.getIssue(), currentUser, ActivityType.COMMENT_EDITED,
                "đã sửa comment");
        issueActivityRepository.save(activity);

        // Publish Event for Comment Edited
        eventPublisher.publishEvent(new DoAn.BE.project.event.IssueEvent(this, comment.getIssue(),
                DoAn.BE.project.event.IssueEvent.EventType.COMMENT_EDITED, currentUser.getUserId()));

        return convertToDTO(comment, currentUser);
    }

    @Transactional
    public void deleteComment(Long commentId, User currentUser) {
        IssueComment comment = issueCommentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy comment"));

        if (comment.getIssue() == null || comment.getIssue().getProject() == null) {
            throw new IllegalStateException("Comment không có issue hoặc dự án liên kết");
        }

        Long projectId = comment.getIssue().getProject().getProjectId();
        validateProjectAccess(projectId, currentUser.getUserId());

        // Kiểm tra quyền xóa comment
        boolean isProjectManager = isProjectManager(projectId, currentUser.getUserId());
        if (!comment.canBeDeletedBy(currentUser, isProjectManager)) {
            throw new ForbiddenException("Bạn không có quyền xóa comment này");
        }

        // Log activity trước khi xóa
        IssueActivity activity = new IssueActivity(comment.getIssue(), currentUser, ActivityType.COMMENT_DELETED,
                "đã xóa comment");
        issueActivityRepository.save(activity);

        // Publish Event for Comment Deleted (Need to capture issue before delete)
        Issue issue = comment.getIssue();

        issueCommentRepository.delete(comment);

        eventPublisher.publishEvent(new DoAn.BE.project.event.IssueEvent(this, issue,
                DoAn.BE.project.event.IssueEvent.EventType.COMMENT_DELETED, currentUser.getUserId()));
    }

    @Transactional(readOnly = true)
    public List<IssueCommentDTO> getProjectComments(Long projectId, User currentUser) {
        if (!accessControlService.canAccessProjects(currentUser)) {
            throw new ForbiddenException("Bạn không có quyền truy cập dự án");
        }

        validateProjectAccess(projectId, currentUser.getUserId());

        List<IssueComment> comments = issueCommentRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
        return comments.stream()
                .map(comment -> convertToDTO(comment, currentUser))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<IssueCommentDTO> getProjectCommentsPaged(Long projectId,
            User currentUser, org.springframework.data.domain.Pageable pageable) {
        if (!accessControlService.canAccessProjects(currentUser)) {
            throw new ForbiddenException("Bạn không có quyền truy cập dự án");
        }

        validateProjectAccess(projectId, currentUser.getUserId());

        org.springframework.data.domain.Page<IssueComment> comments = issueCommentRepository
                .findByProjectIdOrderByCreatedAtDesc(projectId, pageable);
        return comments.map(comment -> convertToDTO(comment, currentUser));
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

    private IssueCommentDTO convertToDTO(IssueComment comment, User currentUser) {
        IssueCommentDTO dto = new IssueCommentDTO();
        dto.setCommentId(comment.getCommentId());

        if (comment.getIssue() != null) {
            dto.setIssueId(comment.getIssue().getIssueId());
            dto.setIssueTitle(comment.getIssue().getTitle());
        }

        if (comment.getAuthor() != null) {
            dto.setAuthorId(comment.getAuthor().getUserId());
            dto.setAuthorName(comment.getAuthor().getUsername());
            dto.setAuthorAvatarUrl(comment.getAuthor().getAvatarUrl());
        }

        dto.setContent(comment.getContent());
        dto.setCreatedAt(comment.getCreatedAt());
        dto.setUpdatedAt(comment.getUpdatedAt());
        dto.setIsEdited(comment.getIsEdited());

        dto.setCanEdit(comment.canBeEditedBy(currentUser));

        if (comment.getIssue() != null && comment.getIssue().getProject() != null) {
            boolean isProjectManager = isProjectManager(comment.getIssue().getProject().getProjectId(),
                    currentUser.getUserId());
            dto.setCanDelete(comment.canBeDeletedBy(currentUser, isProjectManager));
        }

        return dto;
    }
}
