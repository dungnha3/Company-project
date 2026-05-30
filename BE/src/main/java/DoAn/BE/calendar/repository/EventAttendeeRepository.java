package DoAn.BE.calendar.repository;

import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import DoAn.BE.calendar.entity.EventAttendee;
import DoAn.BE.calendar.entity.EventAttendee.ResponseStatus;

@Repository
public interface EventAttendeeRepository extends JpaRepository<EventAttendee, Long> {

    @EntityGraph(attributePaths = { "event", "user" })
    List<EventAttendee> findByEvent_EventId(Long eventId);

    @EntityGraph(attributePaths = { "event", "event.createdBy" })
    List<EventAttendee> findByUser_UserId(Long userId);

    boolean existsByEvent_EventIdAndUser_UserId(Long eventId, Long userId);

    @EntityGraph(attributePaths = { "event", "event.createdBy" })
    List<EventAttendee> findByUser_UserIdAndResponseStatus(Long userId, ResponseStatus status);

    void deleteByEvent_EventId(Long eventId);
}
