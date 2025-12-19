package DoAn.BE.project.repository;

import DoAn.BE.project.entity.IssueComment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface IssueCommentRepository extends JpaRepository<IssueComment, Long> {
    List<IssueComment> findByIssue_IssueIdOrderByCreatedAtAsc(Long issueId);
    
    @Query("SELECT COUNT(c) FROM IssueComment c WHERE c.issue.issueId = :issueId")
    long countByIssueId(@Param("issueId") Long issueId);
    
    @Query("SELECT c FROM IssueComment c WHERE c.issue.project.projectId = :projectId ORDER BY c.createdAt DESC")
    List<IssueComment> findByProjectIdOrderByCreatedAtDesc(@Param("projectId") Long projectId);
}
