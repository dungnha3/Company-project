package DoAn.BE.hrm.repository;

import DoAn.BE.hrm.entity.Contract;
import DoAn.BE.hrm.entity.Contract.ContractStatus;
import DoAn.BE.hrm.entity.Contract.ContractType;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ContractRepository extends JpaRepository<Contract, Long> {

    @EntityGraph(attributePaths = { "employee", "employee.user" })
    List<Contract> findByEmployee_EmployeeId(Long employeeId);

    List<Contract> findByContractType(ContractType contractType);

    @EntityGraph(attributePaths = { "employee" })
    List<Contract> findByStatus(ContractStatus status);

    List<Contract> findByEmployee_EmployeeIdAndStatus(Long employeeId, ContractStatus status);

    Optional<Contract> findFirstByEmployee_EmployeeIdAndStatusOrderByStartDateDesc(
            Long employeeId, ContractStatus status);

    @EntityGraph(attributePaths = { "employee", "employee.user" })
    @Query("SELECT c FROM Contract c WHERE c.status = 'ACTIVE' " +
            "AND c.endDate IS NOT NULL " +
            "AND c.endDate BETWEEN :startDate AND :endDate")
    List<Contract> findExpiringContracts(@Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT c FROM Contract c WHERE c.status = 'ACTIVE' " +
            "AND c.endDate < :currentDate")
    List<Contract> findExpiredContracts(@Param("currentDate") LocalDate currentDate);

    long countByStatus(ContractStatus status);

    @Query("SELECT c.contractType, COUNT(c) FROM Contract c GROUP BY c.contractType")
    List<Object[]> getStatsByContractType();
}
