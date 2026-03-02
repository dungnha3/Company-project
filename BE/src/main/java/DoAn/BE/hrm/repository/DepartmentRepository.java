package DoAn.BE.hrm.repository;

import DoAn.BE.hrm.entity.Department;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, Long> {

    Optional<Department> findByName(String name);

    boolean existsByName(String name);

    List<Department> findByManager_EmployeeId(Long employeeId);

    // Count employees in department
    @Query("SELECT COUNT(e) FROM Employee e WHERE e.department.departmentId = :departmentId")
    long countEmployeesByDepartment(@Param("departmentId") Long departmentId);

    // Search by keyword
    @Query("SELECT d FROM Department d WHERE LOWER(d.name) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Department> searchByKeyword(@Param("keyword") String keyword);
    @Query("SELECT d FROM Department d WHERE d.company.companyId = :companyId")
    List<Department> findByCompanyId(@Param("companyId") Long companyId);
}
