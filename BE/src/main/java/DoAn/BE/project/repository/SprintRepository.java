package DoAn.BE.project.repository;

import DoAn.BE.project.entity.Sprint;
import DoAn.BE.project.entity.Sprint.SprintStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface SprintRepository extends JpaRepository<Sprint, Long> {

    @EntityGraph(attributePaths = { "project", "createdBy" })
    List<Sprint> findByProject_ProjectId(Long projectId);

    @EntityGraph(attributePaths = { "project", "createdBy" })
    List<Sprint> findByProject_ProjectIdAndStatus(Long projectId, SprintStatus status);

    @EntityGraph(attributePaths = { "project", "createdBy" })
    List<Sprint> findByStatus(SprintStatus status);

    @EntityGraph(attributePaths = { "project", "createdBy" })
    org.springframework.data.domain.Page<Sprint> findByStatus(SprintStatus status,
            org.springframework.data.domain.Pageable pageable);

    long countByProject_ProjectId(Long projectId);

    @EntityGraph(attributePaths = { "project", "createdBy" })
    @Query("SELECT s FROM Sprint s WHERE s.project.projectId = :projectId ORDER BY s.createdAt DESC")
    List<Sprint> findByProjectIdOrderByCreatedAtDesc(@Param("projectId") Long projectId);

    @EntityGraph(attributePaths = { "project", "createdBy" })
    Optional<Sprint> findFirstByProject_ProjectIdAndStatus(Long projectId, SprintStatus status);

    @Query("SELECT COUNT(s) FROM Sprint s WHERE s.project.projectId = :projectId AND s.status = :status")
    long countByProjectIdAndStatus(@Param("projectId") Long projectId, @Param("status") SprintStatus status);

    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE Sprint s SET s.status = :status WHERE s.project.projectId = :projectId AND s.status != :status")
    void updateStatusByProjectId(@Param("projectId") Long projectId, @Param("status") SprintStatus status);
}
