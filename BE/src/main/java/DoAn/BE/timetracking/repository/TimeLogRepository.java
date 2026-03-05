package DoAn.BE.timetracking.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import DoAn.BE.timetracking.entity.TimeLog;

@Repository
public interface TimeLogRepository extends JpaRepository<TimeLog, Long> {

    List<TimeLog> findByIssue_IssueIdOrderByWorkDateDesc(Long issueId);

    Page<TimeLog> findByIssue_IssueId(Long issueId, Pageable pageable);

    Page<TimeLog> findByUser_UserIdAndCompany_CompanyIdOrderByWorkDateDesc(
            Long userId, Long companyId, Pageable pageable);

    List<TimeLog> findByUser_UserIdAndWorkDateBetween(
            Long userId, LocalDate startDate, LocalDate endDate);

    List<TimeLog> findByCompany_CompanyIdAndWorkDateBetween(
            Long companyId, LocalDate startDate, LocalDate endDate);

    // Sum hours by issue
    @Query("SELECT COALESCE(SUM(t.loggedHours), 0) FROM TimeLog t WHERE t.issue.issueId = :issueId")
    java.math.BigDecimal sumHoursByIssue(@Param("issueId") Long issueId);

    // Sum hours by user in date range (for timesheet)
    @Query("SELECT COALESCE(SUM(t.loggedHours), 0) FROM TimeLog t " +
            "WHERE t.user.userId = :userId AND t.workDate BETWEEN :startDate AND :endDate")
    java.math.BigDecimal sumHoursByUserAndDateRange(
            @Param("userId") Long userId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    // Sum hours by project
    @Query("SELECT COALESCE(SUM(t.loggedHours), 0) FROM TimeLog t " +
            "WHERE t.issue.project.projectId = :projectId")
    java.math.BigDecimal sumHoursByProject(@Param("projectId") Long projectId);

    // Check if user owns this timelog
    boolean existsByLogIdAndUser_UserId(Long logId, Long userId);
}
