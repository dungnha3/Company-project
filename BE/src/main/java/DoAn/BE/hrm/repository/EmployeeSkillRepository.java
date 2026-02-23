package DoAn.BE.hrm.repository;

import DoAn.BE.hrm.entity.EmployeeSkill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeSkillRepository extends JpaRepository<EmployeeSkill, Long> {

    List<EmployeeSkill> findByEmployeeEmployeeId(Long employeeId);

    @Query("SELECT es FROM EmployeeSkill es WHERE es.employee.employeeId = :empId AND es.skill.id = :skillId")
    Optional<EmployeeSkill> findByEmployeeAndSkill(@Param("empId") Long empId, @Param("skillId") Long skillId);

    @Query("SELECT es FROM EmployeeSkill es JOIN FETCH es.employee JOIN FETCH es.skill")
    List<EmployeeSkill> findAllWithDetails();
}
