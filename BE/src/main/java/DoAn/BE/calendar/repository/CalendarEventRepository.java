package DoAn.BE.calendar.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import DoAn.BE.calendar.entity.CalendarEvent;
import DoAn.BE.calendar.entity.CalendarEvent.EventType;

@Repository
public interface CalendarEventRepository extends JpaRepository<CalendarEvent, Long> {

    @EntityGraph(attributePaths = { "createdBy", "project" })
    List<CalendarEvent> findByCompany_CompanyIdAndStartTimeBetween(
            Long companyId, LocalDateTime start, LocalDateTime end);

    @EntityGraph(attributePaths = { "createdBy", "project" })
    List<CalendarEvent> findByCreatedBy_UserIdAndStartTimeBetween(
            Long userId, LocalDateTime start, LocalDateTime end);

    @EntityGraph(attributePaths = { "createdBy" })
    List<CalendarEvent> findByProject_ProjectIdAndStartTimeBetween(
            Long projectId, LocalDateTime start, LocalDateTime end);

    @EntityGraph(attributePaths = { "createdBy", "project" })
    List<CalendarEvent> findByCompany_CompanyIdAndEventType(Long companyId, EventType type);

    @EntityGraph(attributePaths = { "createdBy", "project" })
    List<CalendarEvent> findByIssue_IssueId(Long issueId);

    @EntityGraph(attributePaths = { "createdBy" })
    @Query("SELECT e FROM CalendarEvent e " +
            "WHERE e.company.companyId = :companyId " +
            "AND e.startTime > :now " +
            "ORDER BY e.startTime ASC")
    List<CalendarEvent> findUpcomingEvents(
            @Param("companyId") Long companyId,
            @Param("now") LocalDateTime now);
}
