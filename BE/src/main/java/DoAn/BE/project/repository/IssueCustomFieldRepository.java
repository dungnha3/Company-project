package DoAn.BE.project.repository;

import DoAn.BE.project.entity.IssueCustomField;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IssueCustomFieldRepository extends JpaRepository<IssueCustomField, Long> {

    // Find all custom fields for a project, ordered by displayOrder
    // /
    List<IssueCustomField> findByProject_ProjectIdAndIsActiveTrueOrderByDisplayOrderAsc(Long projectId);

    // Find all custom fields for a company
    // /
    List<IssueCustomField> findByCompany_CompanyIdAndIsActiveTrue(Long companyId);

    // Find by project and name (for duplicate check)
    // /
    Optional<IssueCustomField> findByProject_ProjectIdAndNameIgnoreCase(Long projectId, String name);

    // Count fields per project
    // /
    long countByProject_ProjectIdAndIsActiveTrue(Long projectId);

    // Get max display order for a project
    // /
    @Query("SELECT COALESCE(MAX(f.displayOrder), 0) FROM IssueCustomField f WHERE f.project.projectId = :projectId")
    Integer findMaxDisplayOrderByProjectId(@Param("projectId") Long projectId);
}
