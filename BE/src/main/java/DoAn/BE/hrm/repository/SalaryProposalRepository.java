package DoAn.BE.hrm.repository;

import DoAn.BE.hrm.entity.SalaryProposal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SalaryProposalRepository extends JpaRepository<SalaryProposal, Long> {

    @EntityGraph(attributePaths = {"employee", "reviewedBy"})
    List<SalaryProposal> findByEmployee_EmployeeIdOrderByCreatedAtDesc(Long employeeId);

    @EntityGraph(attributePaths = {"employee", "reviewedBy"})
    Page<SalaryProposal> findByCompany_CompanyIdOrderByCreatedAtDesc(Long companyId, Pageable pageable);

    @EntityGraph(attributePaths = {"employee", "reviewedBy"})
    @Query("SELECT s FROM SalaryProposal s WHERE s.company.companyId = :companyId AND s.status = :status ORDER BY s.createdAt DESC")
    Page<SalaryProposal> findByCompanyIdAndStatus(@Param("companyId") Long companyId, @Param("status") SalaryProposal.ProposalStatus status, Pageable pageable);
}
