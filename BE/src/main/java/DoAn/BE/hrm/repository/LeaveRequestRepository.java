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
        List<LeaveRequest> findByStartDateLessThanEqualAndEndDateGreaterThanEqual(LocalDate endDate,
                        LocalDate startDate);

        @EntityGraph(attributePaths = { "employee", "employee.user" })
        List<LeaveRequest> findByStatus(LeaveStatus status);

        List<LeaveRequest> findByEmployee_EmployeeIdAndStatus(Long employeeId, LeaveStatus status);

        @Query("SELECT lr FROM LeaveRequest lr WHERE lr.employee.employeeId = :employeeId " +
                        "AND lr.status = 'APPROVED' " +
                        "AND (CAST(EXTRACT(YEAR FROM lr.startDate) AS int) = :year OR CAST(EXTRACT(YEAR FROM lr.endDate) AS int) = :year)")
        List<LeaveRequest> findApprovedByEmployeeAndYear(@Param("employeeId") Long employeeId, @Param("year") int year);

        @Query("SELECT COUNT(lr) > 0 FROM LeaveRequest lr WHERE lr.employee.employeeId = :employeeId " +
                        "AND lr.status = 'APPROVED' " +
                        "AND :date BETWEEN lr.startDate AND lr.endDate")
        boolean isEmployeeOnLeave(@Param("employeeId") Long employeeId, @Param("date") LocalDate date);

        @Query("SELECT COUNT(lr) > 0 FROM LeaveRequest lr WHERE lr.employee.user.userId = :userId " +
                        "AND lr.status = 'APPROVED' " +
                        "AND :date BETWEEN lr.startDate AND lr.endDate")
        boolean isUserOnLeave(@Param("userId") Long userId, @Param("date") LocalDate date);

        @Query("SELECT COUNT(lr) > 0 FROM LeaveRequest lr WHERE lr.employee.user.userId = :userId " +
                        "AND lr.status = 'APPROVED' " +
                        "AND ((:startDate BETWEEN lr.startDate AND lr.endDate) OR (:endDate BETWEEN lr.startDate AND lr.endDate) OR (lr.startDate BETWEEN :startDate AND :endDate))")
        boolean hasOverlappingLeaveByUser(@Param("userId") Long userId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

        long countByStatus(LeaveStatus status);

        List<LeaveRequest> findByApprover_UserId(Long approverId);

        @Query("SELECT lr.leaveType, COUNT(lr) FROM LeaveRequest lr GROUP BY lr.leaveType")
        List<Object[]> getStatsByLeaveType();

        long countByLeaveTypeAndStatus(LeaveType leaveType, LeaveStatus status);

        List<LeaveRequest> findByStartDateBetween(LocalDate startDate, LocalDate endDate);

        @EntityGraph(attributePaths = { "employee", "employee.user", "approver" })
        org.springframework.data.domain.Page<LeaveRequest> findByEmployee_EmployeeId(Long employeeId,
                        org.springframework.data.domain.Pageable pageable);

        @EntityGraph(attributePaths = { "employee", "employee.user" })
        org.springframework.data.domain.Page<LeaveRequest> findByStatus(LeaveStatus status,
                        org.springframework.data.domain.Pageable pageable);

        @EntityGraph(attributePaths = { "employee", "employee.user", "approver" })
        org.springframework.data.domain.Page<LeaveRequest> findByStartDateBetween(LocalDate startDate,
                        LocalDate endDate, org.springframework.data.domain.Pageable pageable);

        @Query("SELECT lr FROM LeaveRequest lr")
        org.springframework.data.domain.Page<LeaveRequest> findAllRequests(
                        org.springframework.data.domain.Pageable pageable);

        @Query("SELECT lr FROM LeaveRequest lr WHERE lr.employee.company.companyId = :companyId")
        org.springframework.data.domain.Page<LeaveRequest> findByCompanyId(@Param("companyId") Long companyId,
                        org.springframework.data.domain.Pageable pageable);

        @Query("SELECT lr FROM LeaveRequest lr WHERE lr.startDate BETWEEN :startDate AND :endDate AND lr.employee.company.companyId = :companyId")
        org.springframework.data.domain.Page<LeaveRequest> findByStartDateBetweenAndEmployee_CompanyId(
                        @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate,
                        @Param("companyId") Long companyId, org.springframework.data.domain.Pageable pageable);

        @EntityGraph(attributePaths = { "employee", "employee.user", "approver" })
        @Query("SELECT lr FROM LeaveRequest lr WHERE lr.status = :status AND lr.employee.company.companyId = :companyId")
        org.springframework.data.domain.Page<LeaveRequest> findByStatusAndCompanyId(
                        @Param("status") LeaveStatus status, @Param("companyId") Long companyId,
                        org.springframework.data.domain.Pageable pageable);

        // Lấy nghỉ phép đã duyệt trong khoảng ngày (cho Calendar team)
        @EntityGraph(attributePaths = { "employee", "employee.user", "approver" })
        @Query("SELECT lr FROM LeaveRequest lr WHERE lr.status = 'APPROVED' " +
               "AND lr.employee.company.companyId = :companyId " +
               "AND lr.startDate <= :endDate AND lr.endDate >= :startDate " +
               "ORDER BY lr.startDate ASC")
        java.util.List<LeaveRequest> findApprovedInDateRangeByCompany(
                        @Param("startDate") java.time.LocalDate startDate,
                        @Param("endDate") java.time.LocalDate endDate,
                        @Param("companyId") Long companyId);
}
