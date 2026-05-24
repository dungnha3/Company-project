package DoAn.BE.project.repository;

import DoAn.BE.project.entity.Project;
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
public interface ProjectRepository extends JpaRepository<Project, Long> {

    long countByCompany_CompanyId(Long companyId);

    List<Project> findByCompany_CompanyId(Long companyId);
    List<Project> findByCompany_CompanyIdAndIsActiveTrue(Long companyId);

    Optional<Project> findByKeyProject(String keyProject);

    List<Project> findByCreatedBy_UserId(Long userId);

    List<Project> findByIsActiveTrue();

    List<Project> findByStatus(Project.ProjectStatus status);

    @EntityGraph(attributePaths = { "createdBy", "members" })
    @Query("SELECT p FROM Project p WHERE p.company.companyId = :companyId AND p.isActive = true")
    List<Project> findByCompanyIdWithMembers(@Param("companyId") Long companyId);

    @Query("SELECT p FROM Project p WHERE p.company.companyId = :companyId AND p.isActive = true")
    Page<Project> findByCompanyIdPaged(@Param("companyId") Long companyId, Pageable pageable);

    @EntityGraph(attributePaths = { "createdBy", "members", "members.user" })
    @Query("SELECT p FROM Project p WHERE p.projectId = :projectId")
    Optional<Project> findByIdWithDetails(@Param("projectId") Long projectId);
    
    @Query("SELECT COUNT(p) FROM Project p WHERE p.company.companyId = :companyId AND p.isActive = true")
    long countByCompanyId(@Param("companyId") Long companyId);
}
