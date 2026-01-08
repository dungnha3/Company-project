package DoAn.BE.hrm.repository;

import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.entity.Employee.EmployeeStatus;
import DoAn.BE.hrm.entity.Department;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Long> {

    @EntityGraph(attributePaths = { "user", "department", "position" })
    Optional<Employee> findByUser_UserId(Long userId);

    Optional<Employee> findByIdCard(String idCard);

    boolean existsByIdCard(String idCard);

    @EntityGraph(attributePaths = { "user" })
    List<Employee> findByStatus(EmployeeStatus status);

    @EntityGraph(attributePaths = { "user", "department", "position" })
    List<Employee> findByDepartment_DepartmentId(Long departmentId);

    List<Employee> findByPosition_PositionId(Long positionId);

    @Query("SELECT e FROM Employee e WHERE " +
            "LOWER(e.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(e.idCard) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Employee> searchByKeyword(@Param("keyword") String keyword);

    long countByStatus(EmployeeStatus status);

    long countByDepartment_DepartmentId(Long departmentId);

    long countByPosition_PositionId(Long positionId);

    List<Employee> findByDepartment(Department department);

    @EntityGraph(attributePaths = { "user" })
    @Query("SELECT e FROM Employee e WHERE MONTH(e.dateOfBirth) = :month AND DAY(e.dateOfBirth) = :day AND e.status = 'ACTIVE'")
    List<Employee> findByBirthday(@Param("month") int month, @Param("day") int day);

    // ==================== TENANT-AWARE QUERIES ====================

    @EntityGraph(attributePaths = { "user", "department", "position" })
    @Query("SELECT e FROM Employee e WHERE e.company.companyId = :companyId")
    List<Employee> findByCompanyId(@Param("companyId") Long companyId);

    @Query("SELECT COUNT(e) FROM Employee e WHERE e.company.companyId = :companyId")
    long countByCompanyId(@Param("companyId") Long companyId);
}
