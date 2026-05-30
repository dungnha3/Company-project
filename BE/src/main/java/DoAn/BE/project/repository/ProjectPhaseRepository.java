package DoAn.BE.project.repository;

import DoAn.BE.project.entity.ProjectPhase;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectPhaseRepository extends JpaRepository<ProjectPhase, Long> {

    @EntityGraph(attributePaths = { "project" })
    List<ProjectPhase> findByProject_ProjectIdOrderByOrderIndexAsc(Long projectId);

    @EntityGraph(attributePaths = { "project" })
    List<ProjectPhase> findByProject_ProjectId(Long projectId);
}
