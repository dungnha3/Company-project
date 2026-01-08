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

        // [Lấy Issue theo ID với tất cả relations] (Role: Internal)
        @EntityGraph(attributePaths = { "project", "sprint", "issueStatus", "reporter", "assignee", "phase" })
        Optional<Issue> findWithRelationsByIssueId(Long issueId);

        // [Lấy Issue theo key với relations] (Role: Internal)
        @EntityGraph(attributePaths = { "project", "sprint", "issueStatus", "reporter", "assignee" })
        Optional<Issue> findByIssueKey(String issueKey);

        // [Lấy Issues của Project - OPTIMIZED] (Role: Project Member)
        @EntityGraph(attributePaths = { "project", "sprint", "issueStatus", "reporter", "assignee" })
        List<Issue> findByProject_ProjectId(Long projectId);

        @EntityGraph(attributePaths = { "project", "sprint", "issueStatus", "reporter", "assignee" })
        Page<Issue> findByProject_ProjectId(Long projectId, Pageable pageable);

        // [Lấy Issues của User (assigned) - OPTIMIZED] (Role: Self)
        @EntityGraph(attributePaths = { "project", "sprint", "issueStatus", "reporter", "assignee" })
        List<Issue> findByAssignee_UserId(Long userId);

        @EntityGraph(attributePaths = { "project", "sprint", "issueStatus", "reporter", "assignee" })
        Page<Issue> findByAssignee_UserId(Long userId, Pageable pageable);

        // [Lấy Issues của User (reported) - OPTIMIZED] (Role: Self)
        @EntityGraph(attributePaths = { "project", "sprint", "issueStatus", "reporter", "assignee" })
        List<Issue> findByReporter_UserId(Long userId);

        @EntityGraph(attributePaths = { "project", "sprint", "issueStatus", "reporter", "assignee" })
        Page<Issue> findByReporter_UserId(Long userId, Pageable pageable);

        // [Lấy Issues của Sprint - OPTIMIZED] (Role: Project Member)
        @EntityGraph(attributePaths = { "project", "sprint", "issueStatus", "reporter", "assignee" })
        List<Issue> findBySprint_SprintId(Long sprintId);

        @EntityGraph(attributePaths = { "project", "sprint", "issueStatus", "reporter", "assignee" })
        Page<Issue> findBySprint_SprintId(Long sprintId, Pageable pageable);

        // [Lấy Backlog (Issues không có Sprint) - OPTIMIZED] (Role: Project Member)
        @EntityGraph(attributePaths = { "project", "issueStatus", "reporter", "assignee" })
        List<Issue> findByProject_ProjectIdAndSprintIsNull(Long projectId);

        @EntityGraph(attributePaths = { "project", "issueStatus", "reporter", "assignee" })
        Page<Issue> findByProject_ProjectIdAndSprintIsNull(Long projectId, Pageable pageable);

        // [Lấy Issues của Phase - OPTIMIZED] (Role: Project Member)
        @EntityGraph(attributePaths = { "project", "sprint", "issueStatus", "reporter", "assignee", "phase" })
        List<Issue> findByPhase_PhaseId(Long phaseId);

        @EntityGraph(attributePaths = { "project", "sprint", "issueStatus", "reporter", "assignee", "phase" })
        Page<Issue> findByPhase_PhaseId(Long phaseId, Pageable pageable);

        // ==================== SIMPLE QUERIES (No relations needed)
        // ====================

        List<Issue> findByProject_ProjectIdAndAssignee_UserId(Long projectId, Long userId);

        List<Issue> findByIssueStatus_StatusId(Integer statusId);

        long countByProject_ProjectId(Long projectId);

        // ==================== OPTIMIZED QUERIES WITH JOIN FETCH ====================

        // [Overdue Issues với JOIN FETCH] (Role: System/Notification)
        @Query("SELECT DISTINCT i FROM Issue i " +
                        "LEFT JOIN FETCH i.project " +
                        "LEFT JOIN FETCH i.issueStatus " +
                        "LEFT JOIN FETCH i.assignee " +
                        "WHERE i.dueDate < :date " +
                        "AND i.issueStatus.name <> 'Done' " +
                        "AND i.assignee IS NOT NULL")
        List<Issue> findOverdueIssuesWithRelations(@Param("date") LocalDate date);

        // [Upcoming Deadlines với JOIN FETCH] (Role: System/Notification)
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
}
