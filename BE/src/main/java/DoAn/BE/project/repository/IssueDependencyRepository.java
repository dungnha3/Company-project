package DoAn.BE.project.repository;

import DoAn.BE.project.entity.IssueDependency;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IssueDependencyRepository extends JpaRepository<IssueDependency, Long> {

    /**
     * Find all dependencies where issue is predecessor
     */
    List<IssueDependency> findByPredecessor_IssueId(Long issueId);

    /**
     * Find all dependencies where issue is successor
     */
    List<IssueDependency> findBySuccessor_IssueId(Long issueId);

    /**
     * Find all dependencies for an issue (both directions)
     */
    @Query("SELECT d FROM IssueDependency d WHERE d.predecessor.issueId = :issueId OR d.successor.issueId = :issueId")
    List<IssueDependency> findAllByIssueId(@Param("issueId") Long issueId);

    /**
     * Find all dependencies for issues in a project
     */
    @Query("SELECT d FROM IssueDependency d WHERE d.predecessor.project.projectId = :projectId")
    List<IssueDependency> findByProjectId(@Param("projectId") Long projectId);

    /**
     * Check if dependency exists
     */
    boolean existsByPredecessor_IssueIdAndSuccessor_IssueId(Long predecessorId, Long successorId);

    /**
     * Find specific dependency
     */
    Optional<IssueDependency> findByPredecessor_IssueIdAndSuccessor_IssueId(Long predecessorId, Long successorId);

    /**
     * Delete all dependencies for an issue
     */
    void deleteByPredecessor_IssueIdOrSuccessor_IssueId(Long predecessorId, Long successorId);

    /**
     * Count dependencies in a project
     */
    @Query("SELECT COUNT(d) FROM IssueDependency d WHERE d.predecessor.project.projectId = :projectId")
    long countByProjectId(@Param("projectId") Long projectId);
}
