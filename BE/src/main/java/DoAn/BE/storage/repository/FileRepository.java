package DoAn.BE.storage.repository;

import DoAn.BE.storage.entity.FileEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FileRepository extends JpaRepository<FileEntity, Long> {

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
}
