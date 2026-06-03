package DoAn.BE.storage.repository;

import DoAn.BE.storage.entity.FileEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FileRepository extends JpaRepository<FileEntity, Long> {

    // Full graph: uploadedBy + project + issue (with issueStatus + assignee)
    @Query("SELECT f FROM FileEntity f LEFT JOIN FETCH f.uploadedBy LEFT JOIN FETCH f.project LEFT JOIN FETCH f.issue LEFT JOIN FETCH f.issue.issueStatus LEFT JOIN FETCH f.issue.assignee WHERE f.project.projectId = :projectId")
    List<FileEntity> findByProjectWithIssueGraph(@Param("projectId") Long projectId);

    @EntityGraph(attributePaths = { "uploadedBy", "project", "issue" })
    List<FileEntity> findByProject_ProjectId(Long projectId);

    @EntityGraph(attributePaths = { "uploadedBy" })
    List<FileEntity> findByCompanyCompanyIdAndProjectIsNull(Long companyId);

    @EntityGraph(attributePaths = { "uploadedBy", "issue" })
    List<FileEntity> findByIssue_IssueId(Long issueId);

    @EntityGraph(attributePaths = { "uploadedBy", "issue" })
    List<FileEntity> findByIssue_IssueIdOrderByCreatedAtDesc(Long issueId);

    @EntityGraph(attributePaths = { "uploadedBy", "project", "issue" })
    List<FileEntity> findByCompanyCompanyId(Long companyId);

    // Find a virtual folder at the root level of a project (folder IS NULL)
    java.util.Optional<FileEntity> findByProject_ProjectIdAndContentTypeAndFolderIsNullAndFileName(
            Long projectId, String contentType, String fileName);

    // Find a virtual folder nested inside another folder
    java.util.Optional<FileEntity> findByProject_ProjectIdAndContentTypeAndFolderAndFileName(
            Long projectId, String contentType, String folder, String fileName);
}
