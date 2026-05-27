package DoAn.BE.project.repository;

import DoAn.BE.project.entity.IssueActivity;
import DoAn.BE.project.entity.IssueActivity.ActivityType;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface IssueActivityRepository extends JpaRepository<IssueActivity, Long> {

    // [OPTIMIZED: Fetch with user for activity list display]
    @EntityGraph(attributePaths = { "user" })
    List<IssueActivity> findByIssue_IssueIdOrderByCreatedAtDesc(Long issueId);

    @EntityGraph(attributePaths = { "user" })
    org.springframework.data.domain.Page<IssueActivity> findByIssue_IssueIdOrderByCreatedAtDesc(Long issueId,
            org.springframework.data.domain.Pageable pageable);

    // [OPTIMIZED: Fetch with user and issue for project activity feed]
    @EntityGraph(attributePaths = { "user", "issue" })
    List<IssueActivity> findByIssue_Project_ProjectIdOrderByCreatedAtDesc(Long projectId);

    @EntityGraph(attributePaths = { "user", "issue" })
    org.springframework.data.domain.Page<IssueActivity> findByIssue_Project_ProjectIdOrderByCreatedAtDesc(
            Long projectId, org.springframework.data.domain.Pageable pageable);

    @EntityGraph(attributePaths = { "user" })
    List<IssueActivity> findByActivityTypeOrderByCreatedAtDesc(ActivityType activityType);

    @Query("SELECT COUNT(a) FROM IssueActivity a WHERE a.issue.issueId = :issueId")
    long countByIssueId(@Param("issueId") Long issueId);

    // [OPTIMIZED: Fetch with issue for user's project activity]
    @EntityGraph(attributePaths = { "user", "issue" })
    List<IssueActivity> findByIssue_Project_ProjectIdAndUser_UserIdOrderByCreatedAtDesc(Long projectId, Long userId);

    @EntityGraph(attributePaths = { "user", "issue" })
    org.springframework.data.domain.Page<IssueActivity> findByIssue_Project_ProjectIdAndUser_UserIdOrderByCreatedAtDesc(
            Long projectId, Long userId, org.springframework.data.domain.Pageable pageable);

    // [OPTIMIZED: Count activities since date - for dashboard]
    @Query("SELECT COUNT(a) FROM IssueActivity a WHERE a.issue.project.projectId = :projectId AND a.createdAt > :since")
    long countByProjectIdSince(@Param("projectId") Long projectId, @Param("since") java.time.LocalDateTime since);
}
