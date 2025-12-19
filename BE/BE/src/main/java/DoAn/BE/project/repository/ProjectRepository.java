package DoAn.BE.project.repository;

import DoAn.BE.project.entity.Project;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
    Optional<Project> findByKeyProject(String keyProject);

    List<Project> findByCreatedBy_UserId(Long userId);

    List<Project> findByIsActiveTrue();

    List<Project> findByStatus(Project.ProjectStatus status);
}
