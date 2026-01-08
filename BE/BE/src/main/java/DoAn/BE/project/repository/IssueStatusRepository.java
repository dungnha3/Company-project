package DoAn.BE.project.repository;

import DoAn.BE.project.entity.IssueStatus;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface IssueStatusRepository extends JpaRepository<IssueStatus, Integer> {

    // [Direct query - used by AIActionExecutor]
    Optional<IssueStatus> findByName(String name);

    // [OPTIMIZED: Find status by name case-insensitive]
    @Query("SELECT s FROM IssueStatus s WHERE LOWER(s.name) = LOWER(:name)")
    Optional<IssueStatus> findByNameIgnoreCase(String name);

    // [OPTIMIZED: Find default status (first by order)]
    Optional<IssueStatus> findFirstByOrderByOrderIndexAsc();

    // [Find "To Do" status - commonly needed]
    @Query("SELECT s FROM IssueStatus s WHERE LOWER(s.name) LIKE '%to do%' OR s.orderIndex = 0")
    Optional<IssueStatus> findDefaultTodoStatus();
}
