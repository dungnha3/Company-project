package DoAn.BE.chat.repository;

import DoAn.BE.chat.entity.Meeting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MeetingRepository extends JpaRepository<Meeting, Long> {

        // Find active meetings in a specific chat room
        @Query("SELECT m FROM Meeting m WHERE m.chatRoom.roomId = :roomId AND m.status IN ('SCHEDULED', 'IN_PROGRESS')")
        List<Meeting> findActiveMeetingsByRoomId(@Param("roomId") Long roomId);

        // Find upcoming scheduled meetings for a user (via ChatRoom participation -
        // complex, maybe later)

        // Find meetings passing their scheduled start time that need to be
        // started/closed
        List<Meeting> findByStatusAndStartTimeBefore(Meeting.MeetingStatus status, LocalDateTime dateTime);
}
