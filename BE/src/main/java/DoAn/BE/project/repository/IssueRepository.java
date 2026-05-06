package DoAn.BE.project.repository;

import DoAn.BE.project.entity.Issue;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface IssueRepository extends JpaRepository<Issue, Long> {

        // ==================== FETCH WITH RELATIONS (Optimized - No N+1)
        // ====================
        @EntityGraph(attributePaths = { "project", "sprint", "issueStatus", "reporter", "assignee", "phase" })
        Optional<Issue> findWithRelationsByIssueId(Long issueId);

        @EntityGraph(attributePaths = { "project", "sprint", "issueStatus", "reporter", "assignee" })
        Optional<Issue> findByIssueKey(String issueKey);

        @EntityGraph(attributePaths = { "project", "sprint", "issueStatus", "reporter", "assignee" })
        List<Issue> findByProject_ProjectId(Long projectId);

        @EntityGraph(attributePaths = { "project", "sprint", "issueStatus", "reporter", "assignee" })
        Page<Issue> findByProject_ProjectId(Long projectId, Pageable pageable);

        @EntityGraph(attributePaths = { "project", "sprint", "issueStatus", "reporter", "assignee" })
        List<Issue> findByAssignee_UserId(Long userId);

        @EntityGraph(attributePaths = { "project", "sprint", "issueStatus", "reporter", "assignee" })
        Page<Issue> findByAssignee_UserId(Long userId, Pageable pageable);

        @EntityGraph(attributePaths = { "project", "sprint", "issueStatus", "reporter", "assignee" })
        List<Issue> findByReporter_UserId(Long userId);

        @EntityGraph(attributePaths = { "project", "sprint", "issueStatus", "reporter", "assignee" })
        Page<Issue> findByReporter_UserId(Long userId, Pageable pageable);

        @EntityGraph(attributePaths = { "project", "sprint", "issueStatus", "reporter", "assignee" })
        List<Issue> findBySprint_SprintId(Long sprintId);

        @EntityGraph(attributePaths = { "project", "sprint", "issueStatus", "reporter", "assignee" })
        Page<Issue> findBySprint_SprintId(Long sprintId, Pageable pageable);

        @EntityGraph(attributePaths = { "project", "issueStatus", "reporter", "assignee" })
        List<Issue> findByProject_ProjectIdAndSprintIsNull(Long projectId);

        @EntityGraph(attributePaths = { "project", "issueStatus", "reporter", "assignee" })
        Page<Issue> findByProject_ProjectIdAndSprintIsNull(Long projectId, Pageable pageable);

        @EntityGraph(attributePaths = { "project", "sprint", "issueStatus", "reporter", "assignee", "phase" })
        List<Issue> findByPhase_PhaseId(Long phaseId);

        @EntityGraph(attributePaths = { "project", "sprint", "issueStatus", "reporter", "assignee", "phase" })
        Page<Issue> findByPhase_PhaseId(Long phaseId, Pageable pageable);

        // ==================== SIMPLE QUERIES (No relations needed)
        // ====================

        List<Issue> findByProject_ProjectIdAndAssignee_UserId(Long projectId, Long userId);

        List<Issue> findByIssueStatus_StatusId(Integer statusId);

        long countByProject_ProjectId(Long projectId);

        @Query("SELECT COUNT(i) FROM Issue i WHERE i.project.projectId = :projectId AND i.issueStatus.name = 'Done'")
        long countCompletedByProject(@Param("projectId") Long projectId);

        @Query("SELECT DISTINCT i FROM Issue i " +
                        "LEFT JOIN FETCH i.project " +
                        "LEFT JOIN FETCH i.issueStatus " +
                        "LEFT JOIN FETCH i.assignee " +
                        "WHERE i.dueDate < :date " +
                        "AND i.issueStatus.name <> 'Done' " +
                        "AND i.assignee IS NOT NULL")
        List<Issue> findOverdueIssuesWithRelations(@Param("date") LocalDate date);

        @Query("SELECT DISTINCT i FROM Issue i " +
                        "LEFT JOIN FETCH i.project " +
                        "LEFT JOIN FETCH i.issueStatus " +
                        "LEFT JOIN FETCH i.assignee " +
                        "WHERE i.dueDate = :date " +
                        "AND i.issueStatus.name <> 'Done' " +
                        "AND i.assignee IS NOT NULL")
        List<Issue> findUpcomingDeadlinesWithRelations(@Param("date") LocalDate date);

        // [Paginated overdue - for large datasets]
        @Query("SELECT i FROM Issue i WHERE i.dueDate < :date AND i.issueStatus.name <> 'Done' AND i.assignee IS NOT NULL")
        Page<Issue> findOverdueIssues(@Param("date") LocalDate date, Pageable pageable);

        // [Paginated upcoming - for large datasets]
        @Query("SELECT i FROM Issue i WHERE i.dueDate = :date AND i.issueStatus.name <> 'Done' AND i.assignee IS NOT NULL")
        Page<Issue> findUpcomingDeadlines(@Param("date") LocalDate date, Pageable pageable);

        @org.springframework.data.jpa.repository.Modifying
        @Query("UPDATE Issue i SET i.issueStatus = :status WHERE i.project.projectId = :projectId")
        void updateStatusByProjectId(@Param("projectId") Long projectId,
                        @Param("status") DoAn.BE.project.entity.IssueStatus status);

        @org.springframework.data.jpa.repository.Modifying
        @Query("UPDATE Issue i SET i.assignee = NULL WHERE i.project.projectId = :projectId AND i.assignee.userId = :userId")
        void unassignByProjectMember(@Param("projectId") Long projectId, @Param("userId") Long userId);

        @org.springframework.data.jpa.repository.Modifying
        @Query("UPDATE Issue i SET i.assignee = NULL WHERE i.assignee.userId = :userId")
        void unassignByGlobalUser(@Param("userId") Long userId);
        long countBySprint_SprintId(Long sprintId);

        @Query("SELECT COUNT(i) FROM Issue i WHERE i.sprint.sprintId = :sprintId AND i.issueStatus.name = 'Done'")
        long countCompletedBySprint(@Param("sprintId") Long sprintId);
        @Query("SELECT MAX(CAST(SUBSTRING(i.issueKey, LENGTH(i.project.keyProject) + 2) AS long)) FROM Issue i WHERE i.project.projectId = :projectId")
        Long findMaxIssueNumberByProjectId(@Param("projectId") Long projectId);

        // Count issues assigned to a user in a specific project (for TeamTab stats)
        long countByProject_ProjectIdAndAssignee_UserId(Long projectId, Long userId);

        @Query("SELECT COUNT(i) FROM Issue i WHERE i.project.projectId = :projectId " +
               "AND i.assignee.userId = :userId AND i.issueStatus.name = 'Done'")
        long countCompletedByProjectAndAssignee(
                @Param("projectId") Long projectId,
                @Param("userId") Long userId);
}
