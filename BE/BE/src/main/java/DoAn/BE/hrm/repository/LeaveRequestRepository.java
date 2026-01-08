package DoAn.BE.hrm.repository;

import DoAn.BE.hrm.entity.LeaveRequest;
import DoAn.BE.hrm.entity.LeaveRequest.LeaveStatus;
import DoAn.BE.hrm.entity.LeaveRequest.LeaveType;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {

    @EntityGraph(attributePaths = { "employee", "employee.user", "approver" })
    List<LeaveRequest> findByEmployee_EmployeeId(Long employeeId);

    // Find overlapping requests
    List<LeaveRequest> findByStartDateLessThanEqualAndEndDateGreaterThanEqual(LocalDate endDate, LocalDate startDate);

    @EntityGraph(attributePaths = { "employee", "employee.user" })
    List<LeaveRequest> findByStatus(LeaveStatus status);

    List<LeaveRequest> findByEmployee_EmployeeIdAndStatus(Long employeeId, LeaveStatus status);

    @Query("SELECT lr FROM LeaveRequest lr WHERE lr.employee.employeeId = :employeeId " +
            "AND lr.status = 'APPROVED' " +
            "AND (YEAR(lr.startDate) = :year OR YEAR(lr.endDate) = :year)")
    List<LeaveRequest> findApprovedByEmployeeAndYear(@Param("employeeId") Long employeeId, @Param("year") int year);

    @Query("SELECT COUNT(lr) > 0 FROM LeaveRequest lr WHERE lr.employee.employeeId = :employeeId " +
            "AND lr.status = 'APPROVED' " +
            "AND :date BETWEEN lr.startDate AND lr.endDate")
    boolean isEmployeeOnLeave(@Param("employeeId") Long employeeId, @Param("date") LocalDate date);

    long countByStatus(LeaveStatus status);

    List<LeaveRequest> findByApprover_UserId(Long approverId);

    @Query("SELECT lr.leaveType, COUNT(lr) FROM LeaveRequest lr GROUP BY lr.leaveType")
    List<Object[]> getStatsByLeaveType();

    long countByLeaveTypeAndStatus(LeaveType leaveType, LeaveStatus status);

    List<LeaveRequest> findByStartDateBetween(LocalDate startDate, LocalDate endDate);
}
