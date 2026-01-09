package DoAn.BE.user.repository;

import DoAn.BE.user.entity.PersonalWorkspace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PersonalWorkspaceRepository extends JpaRepository<PersonalWorkspace, Long> {

    Optional<PersonalWorkspace> findByUser_UserId(Long userId);

    boolean existsByUser_UserId(Long userId);
}
