package DoAn.BE.hrm.repository;

import DoAn.BE.hrm.entity.Attendance;
import DoAn.BE.hrm.entity.Employee;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long> {

        @EntityGraph(attributePaths = { "employee" })
        List<Attendance> findByEmployee_EmployeeIdOrderByAttendanceDateDesc(Long employeeId);

        @EntityGraph(attributePaths = { "employee" })
        List<Attendance> findByAttendanceDateBetween(LocalDate start, LocalDate end);

        List<Attendance> findByEmployee_EmployeeIdAndAttendanceDateBetween(Long employeeId, LocalDate start,
                        LocalDate end);

        List<Attendance> findByEmployee_EmployeeIdAndAttendanceDate(Long employeeId, LocalDate attendanceDate);

        // Native queries updated for new table/column names (attendances,
        // attendance_date, status, working_hours)
        @Query(value = "SELECT COUNT(*) FROM attendances a " +
                        "WHERE a.employee_id = :employeeId " +
                        "AND a.company_id = :#{T(DoAn.BE.common.context.TenantContext).getCompanyId()} " +
                        "AND a.attendance_date BETWEEN :startDate AND :endDate " +
                        "AND a.status IN ('FULL_DAY', 'LATE', 'EARLY_LEAVE')", nativeQuery = true)
        int countWorkingDaysByEmployeeAndMonth(@Param("employeeId") Long employeeId,
                        @Param("startDate") LocalDate startDate,
                        @Param("endDate") LocalDate endDate);

        @Query(value = "SELECT COALESCE(SUM(a.working_hours), 0) FROM attendances a " +
                        "WHERE a.employee_id = :employeeId " +
                        "AND a.company_id = :#{T(DoAn.BE.common.context.TenantContext).getCompanyId()} " +
                        "AND a.attendance_date BETWEEN :startDate AND :endDate", nativeQuery = true)
        BigDecimal sumWorkingHoursByEmployeeAndMonth(@Param("employeeId") Long employeeId,
                        @Param("startDate") LocalDate startDate,
                        @Param("endDate") LocalDate endDate);

        @Query(value = "SELECT COUNT(*) FROM attendances a " +
                        "WHERE a.employee_id = :employeeId " +
                        "AND a.company_id = :#{T(DoAn.BE.common.context.TenantContext).getCompanyId()} " +
                        "AND a.attendance_date BETWEEN :startDate AND :endDate " +
                        "AND a.status = 'LATE'", nativeQuery = true)
        long countLateDaysByEmployeeAndMonth(@Param("employeeId") Long employeeId,
                        @Param("startDate") LocalDate startDate,
                        @Param("endDate") LocalDate endDate);

        @Query(value = "SELECT COUNT(*) FROM attendances a " +
                        "WHERE a.employee_id = :employeeId " +
                        "AND a.company_id = :#{T(DoAn.BE.common.context.TenantContext).getCompanyId()} " +
                        "AND a.attendance_date BETWEEN :startDate AND :endDate " +
                        "AND a.status = 'EARLY_LEAVE'", nativeQuery = true)
        long countEarlyLeaveDaysByEmployeeAndMonth(@Param("employeeId") Long employeeId,
                        @Param("startDate") LocalDate startDate,
                        @Param("endDate") LocalDate endDate);

        List<Attendance> findByEmployeeAndAttendanceDateBetween(Employee employee, LocalDate startDate,
                        LocalDate endDate);

        @EntityGraph(attributePaths = { "employee" })
        List<Attendance> findByEmployeeInAndAttendanceDateBetween(List<Employee> employees, LocalDate startDate,
                        LocalDate endDate);

        List<Attendance> findByEmployee_User_UserIdIn(List<Long> userIds);

        @EntityGraph(attributePaths = { "employee", "employee.user" })
        @Query("SELECT a FROM Attendance a WHERE a.company.companyId = :companyId ORDER BY a.attendanceDate DESC")
        List<Attendance> findByCompanyId(@Param("companyId") Long companyId);

        @EntityGraph(attributePaths = { "employee", "employee.user" })
        @Query("SELECT a FROM Attendance a WHERE a.company.companyId = :companyId ORDER BY a.attendanceDate DESC")
        org.springframework.data.domain.Page<Attendance> findByCompanyId(@Param("companyId") Long companyId,
                        org.springframework.data.domain.Pageable pageable);

        @EntityGraph(attributePaths = { "employee" })
        org.springframework.data.domain.Page<Attendance> findByEmployee_EmployeeIdOrderByAttendanceDateDesc(
                        Long employeeId, org.springframework.data.domain.Pageable pageable);

        @EntityGraph(attributePaths = { "employee" })
        org.springframework.data.domain.Page<Attendance> findByAttendanceDateBetween(LocalDate start, LocalDate end,
                        org.springframework.data.domain.Pageable pageable);

        @EntityGraph(attributePaths = { "employee" })
        @Query("SELECT a FROM Attendance a WHERE a.employee.employeeId = :employeeId AND MONTH(a.attendanceDate) = :month AND YEAR(a.attendanceDate) = :year")
        org.springframework.data.domain.Page<Attendance> findByEmployeeAndMonth(@Param("employeeId") Long employeeId,
                        @Param("month") int month, @Param("year") int year,
                        org.springframework.data.domain.Pageable pageable);
}
