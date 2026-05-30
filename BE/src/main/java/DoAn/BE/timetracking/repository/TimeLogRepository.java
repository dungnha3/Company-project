package DoAn.BE.timetracking.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import DoAn.BE.timetracking.entity.TimeLog;

@Repository
public interface TimeLogRepository extends JpaRepository<TimeLog, Long> {

    @EntityGraph(attributePaths = { "issue", "issue.project", "issue.assignee", "user", "company" })
    List<TimeLog> findByIssue_IssueIdOrderByWorkDateDesc(Long issueId);

    @EntityGraph(attributePaths = { "issue", "issue.project", "issue.assignee", "user", "company" })
    Page<TimeLog> findByIssue_IssueId(Long issueId, Pageable pageable);

    @EntityGraph(attributePaths = { "issue", "issue.project", "issue.assignee", "user", "company" })
    Page<TimeLog> findByUser_UserIdAndCompany_CompanyIdOrderByWorkDateDesc(
            Long userId, Long companyId, Pageable pageable);

    @EntityGraph(attributePaths = { "issue", "issue.project", "issue.assignee", "user", "company" })
    List<TimeLog> findByUser_UserIdAndWorkDateBetween(
            Long userId, LocalDate startDate, LocalDate endDate);

    @EntityGraph(attributePaths = { "issue", "issue.project", "issue.assignee", "user", "company" })
    List<TimeLog> findByCompany_CompanyIdAndWorkDateBetween(
            Long companyId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT COALESCE(SUM(t.loggedHours), 0) FROM TimeLog t WHERE t.issue.issueId = :issueId")
    java.math.BigDecimal sumHoursByIssue(@Param("issueId") Long issueId);

    @Query("SELECT COALESCE(SUM(t.loggedHours), 0) FROM TimeLog t " +
            "WHERE t.user.userId = :userId AND t.workDate BETWEEN :startDate AND :endDate")
    java.math.BigDecimal sumHoursByUserAndDateRange(
            @Param("userId") Long userId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT COALESCE(SUM(t.loggedHours), 0) FROM TimeLog t " +
            "WHERE t.issue.project.projectId = :projectId")
    java.math.BigDecimal sumHoursByProject(@Param("projectId") Long projectId);

    boolean existsByLogIdAndUser_UserId(Long logId, Long userId);

    @Query("SELECT COALESCE(SUM(t.loggedHours), 0) FROM TimeLog t " +
            "WHERE t.user.userId = :userId AND t.issue.project.projectId = :projectId")
    java.math.BigDecimal sumHoursByUserAndProject(
            @Param("userId") Long userId,
            @Param("projectId") Long projectId);

    @Query("SELECT t.user.userId, t.issue.project.projectId, COALESCE(SUM(t.loggedHours), 0) " +
            "FROM TimeLog t WHERE t.issue.project.projectId IN :projectIds AND t.user.userId IN :userIds " +
            "GROUP BY t.user.userId, t.issue.project.projectId")
    List<Object[]> sumHoursByUsersAndProjects(
            @Param("userIds") List<Long> userIds,
            @Param("projectIds") List<Long> projectIds);

    @Query("SELECT COALESCE(SUM(t.loggedHours), 0) FROM TimeLog t " +
            "WHERE t.user.userId = :userId AND t.company.companyId = :companyId")
    java.math.BigDecimal sumHoursByUser(
            @Param("userId") Long userId,
            @Param("companyId") Long companyId);

    @EntityGraph(attributePaths = { "user", "issue" })
    List<TimeLog> findByCompany_CompanyId(Long companyId);

    @EntityGraph(attributePaths = { "user", "issue" })
    @Query("SELECT t FROM TimeLog t WHERE t.company.companyId = :companyId AND t.workDate BETWEEN :start AND :end ORDER BY t.workDate DESC")
    List<TimeLog> findByCompanyAndMonth(
            @Param("companyId") Long companyId,
            @Param("start") LocalDate start,
            @Param("end") LocalDate end);
}
