package DoAn.BE.storage.repository;

import DoAn.BE.storage.entity.FileEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FileRepository extends JpaRepository<FileEntity, Long> {
    List<FileEntity> findByProject_ProjectId(Long projectId);
    List<FileEntity> findByCompanyCompanyIdAndProjectIsNull(Long companyId);
    List<FileEntity> findByIssue_IssueId(Long issueId);
    List<FileEntity> findByIssue_IssueIdOrderByCreatedAtDesc(Long issueId);
    List<FileEntity> findByCompanyCompanyId(Long companyId);
}
