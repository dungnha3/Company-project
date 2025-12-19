package DoAn.BE.project.repository;

import DoAn.BE.project.entity.IssueActivity;
import DoAn.BE.project.entity.IssueActivity.ActivityType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface IssueActivityRepository extends JpaRepository<IssueActivity, Long> {
    List<IssueActivity> findByIssue_IssueIdOrderByCreatedAtDesc(Long issueId);
    
    @Query("SELECT a FROM IssueActivity a WHERE a.issue.project.projectId = :projectId ORDER BY a.createdAt DESC")
    List<IssueActivity> findByProjectIdOrderByCreatedAtDesc(@Param("projectId") Long projectId);
    
    List<IssueActivity> findByActivityTypeOrderByCreatedAtDesc(ActivityType activityType);
    
    @Query("SELECT COUNT(a) FROM IssueActivity a WHERE a.issue.issueId = :issueId")
    long countByIssueId(@Param("issueId") Long issueId);
    
    @Query("SELECT a FROM IssueActivity a WHERE a.issue.project.projectId = :projectId AND a.user.userId = :userId ORDER BY a.createdAt DESC")
    List<IssueActivity> findByProjectIdAndUserIdOrderByCreatedAtDesc(@Param("projectId") Long projectId, @Param("userId") Long userId);
}
