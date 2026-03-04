package DoAn.BE.project.repository;

import DoAn.BE.project.entity.ProjectGoal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectGoalRepository extends JpaRepository<ProjectGoal, Long> {
    List<ProjectGoal> findByProject_ProjectIdAndMonthAndYearOrderByCreatedAtAsc(Long projectId, Integer month,
            Integer year);

    List<ProjectGoal> findByProject_ProjectIdOrderByYearDescMonthDescCreatedAtAsc(Long projectId);
}
