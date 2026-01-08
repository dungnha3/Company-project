package DoAn.BE.project.repository;

import DoAn.BE.project.entity.IssueComment;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface IssueCommentRepository extends JpaRepository<IssueComment, Long> {

    // [OPTIMIZED: Fetch with user for comment display]
    @EntityGraph(attributePaths = { "user" })
    List<IssueComment> findByIssue_IssueIdOrderByCreatedAtAsc(Long issueId);

    @Query("SELECT COUNT(c) FROM IssueComment c WHERE c.issue.issueId = :issueId")
    long countByIssueId(@Param("issueId") Long issueId);

    // [OPTIMIZED: Fetch with user and issue for project activity]
    @EntityGraph(attributePaths = { "user", "issue" })
    @Query("SELECT c FROM IssueComment c WHERE c.issue.project.projectId = :projectId ORDER BY c.createdAt DESC")
    List<IssueComment> findByProjectIdOrderByCreatedAtDesc(@Param("projectId") Long projectId);

    // [OPTIMIZED: Count comments since date - for dashboard]
    @Query("SELECT COUNT(c) FROM IssueComment c WHERE c.issue.project.projectId = :projectId AND c.createdAt > :since")
    long countByProjectIdSince(@Param("projectId") Long projectId, @Param("since") java.time.LocalDateTime since);

    // ==================== PAGINATION SUPPORT ====================
    @EntityGraph(attributePaths = { "user" })
    org.springframework.data.domain.Page<IssueComment> findByIssue_IssueIdOrderByCreatedAtAsc(Long issueId,
            org.springframework.data.domain.Pageable pageable);

    @EntityGraph(attributePaths = { "user", "issue" })
    @Query("SELECT c FROM IssueComment c WHERE c.issue.project.projectId = :projectId ORDER BY c.createdAt DESC")
    org.springframework.data.domain.Page<IssueComment> findByProjectIdOrderByCreatedAtDesc(
            @Param("projectId") Long projectId, org.springframework.data.domain.Pageable pageable);
}
