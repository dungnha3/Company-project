package DoAn.BE.project.repository;

import DoAn.BE.project.entity.IssueStatus;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IssueStatusRepository extends JpaRepository<IssueStatus, Integer> {
    Optional<IssueStatus> findByName(String name);
}


