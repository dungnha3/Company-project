package DoAn.BE.user.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import DoAn.BE.user.entity.PersonalTask;
import DoAn.BE.user.entity.PersonalTask.TaskStatus;

@Repository
public interface PersonalTaskRepository extends JpaRepository<PersonalTask, Long> {

    // Basic queries
    List<PersonalTask> findByWorkspace_WorkspaceIdOrderByCreatedAtDesc(Long workspaceId);

    List<PersonalTask> findByWorkspace_WorkspaceIdAndStatusOrderByCreatedAtDesc(Long workspaceId, TaskStatus status);

    // Count for quota check
    long countByWorkspace_WorkspaceId(Long workspaceId);

    long countByWorkspace_WorkspaceIdAndStatus(Long workspaceId, TaskStatus status);

    // Overdue count
    @Query("SELECT COUNT(t) FROM PersonalTask t WHERE t.workspace.workspaceId = :workspaceId " +
            "AND t.dueDate < :today AND t.status != 'DONE'")
    long countOverdue(@Param("workspaceId") Long workspaceId, @Param("today") LocalDate today);

    // For reminders (scheduled job)
    @Query("SELECT t FROM PersonalTask t WHERE t.reminderAt <= :now AND t.reminderSent = false AND t.status != 'DONE'")
    List<PersonalTask> findPendingReminders(@Param("now") java.time.LocalDateTime now);
}
