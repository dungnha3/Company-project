package DoAn.BE.project.repository;

import DoAn.BE.project.entity.Sprint;
import DoAn.BE.project.entity.Sprint.SprintStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface SprintRepository extends JpaRepository<Sprint, Long> {
    List<Sprint> findByProject_ProjectId(Long projectId);
    List<Sprint> findByProject_ProjectIdAndStatus(Long projectId, SprintStatus status);
    List<Sprint> findByStatus(SprintStatus status);
    
    @Query("SELECT s FROM Sprint s WHERE s.project.projectId = :projectId ORDER BY s.createdAt DESC")
    List<Sprint> findByProjectIdOrderByCreatedAtDesc(@Param("projectId") Long projectId);
    
    Optional<Sprint> findFirstByProject_ProjectIdAndStatus(Long projectId, SprintStatus status);
    
    @Query("SELECT COUNT(s) FROM Sprint s WHERE s.project.projectId = :projectId AND s.status = :status")
    long countByProjectIdAndStatus(@Param("projectId") Long projectId, @Param("status") SprintStatus status);
}
