package DoAn.BE.hrm.repository;

import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.entity.Employee.EmployeeStatus;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Long> {

        @EntityGraph(attributePaths = { "user" })
        Optional<Employee> findByUser_UserId(Long userId);

        Optional<Employee> findByIdCard(String idCard);

        boolean existsByIdCard(String idCard);

        // ...

        @EntityGraph(attributePaths = { "user" })
        List<Employee> findByStatus(EmployeeStatus status);

        @EntityGraph(attributePaths = { "user" })
        Page<Employee> findByStatus(EmployeeStatus status, Pageable pageable);



        @Query("SELECT e FROM Employee e WHERE " +
                        "LOWER(e.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
                        "LOWER(e.idCard) LIKE LOWER(CONCAT('%', :keyword, '%'))")
        List<Employee> searchByKeyword(@Param("keyword") String keyword);

        @Query("SELECT e FROM Employee e WHERE " +
                        "LOWER(e.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
                        "LOWER(e.idCard) LIKE LOWER(CONCAT('%', :keyword, '%'))")
        Page<Employee> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

        long countByStatus(EmployeeStatus status);



        @EntityGraph(attributePaths = { "user" })
        @Query("SELECT e FROM Employee e WHERE MONTH(e.dateOfBirth) = :month AND DAY(e.dateOfBirth) = :day AND e.status = 'ACTIVE'")
        List<Employee> findByBirthday(@Param("month") int month, @Param("day") int day);

        @EntityGraph(attributePaths = { "user" })
        @Query("SELECT e FROM Employee e WHERE e.company.companyId = :companyId")
        List<Employee> findByCompanyId(@Param("companyId") Long companyId);
        
        @EntityGraph(attributePaths = { "user" })
        @Query("SELECT e FROM Employee e WHERE e.company.companyId = :companyId " +
               "AND (:status IS NULL OR e.status = :status) " +
               "AND (:keyword IS NULL OR LOWER(e.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(e.user.email) LIKE LOWER(CONCAT('%', :keyword, '%')))")
        Page<Employee> findByCompanyIdWithFilters(
            @Param("companyId") Long companyId, 
            @Param("keyword") String keyword, 
            @Param("status") EmployeeStatus status, 
            Pageable pageable);

        @Query("SELECT COUNT(e) FROM Employee e WHERE e.company.companyId = :companyId")
        long countByCompanyId(@Param("companyId") Long companyId);

        // Multi-tenant-safe: Find employee by user ID within a specific company
        @EntityGraph(attributePaths = { "user" })
        Optional<Employee> findByUser_UserIdAndCompany_CompanyId(Long userId, Long companyId);
        @EntityGraph(attributePaths = { "user" })
        Page<Employee> findByStatusAndCompany_CompanyId(EmployeeStatus status, Long companyId, Pageable pageable);
        @EntityGraph(attributePaths = { "user" })
        List<Employee> findByStatusAndCompany_CompanyId(EmployeeStatus status, Long companyId);
}
