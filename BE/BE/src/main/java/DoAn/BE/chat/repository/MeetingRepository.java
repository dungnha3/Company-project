package DoAn.BE.chat.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import DoAn.BE.chat.entity.Meeting;
import DoAn.BE.chat.entity.Meeting.MeetingStatus;

@Repository
public interface MeetingRepository extends JpaRepository<Meeting, Long> {

    // Tìm meetings của một room
    List<Meeting> findByChatRoom_RoomIdOrderByStartTimeDesc(Long roomId);

    // Tìm meetings sắp tới của user (qua participants)
    @Query("SELECT DISTINCT m FROM Meeting m " +
            "JOIN m.participants p " +
            "WHERE p.user.userId = :userId " +
            "AND m.startTime > :now " +
            "AND m.status IN ('SCHEDULED', 'IN_PROGRESS') " +
            "ORDER BY m.startTime ASC")
    List<Meeting> findUpcomingMeetingsByUserId(@Param("userId") Long userId, @Param("now") LocalDateTime now);

    // Tìm meetings đang diễn ra của room
    List<Meeting> findByChatRoom_RoomIdAndStatus(Long roomId, MeetingStatus status);

    // Tìm meetings do user tạo
    List<Meeting> findByCreatedBy_UserIdOrderByCreatedAtDesc(Long userId);

    // Tìm meetings trong khoảng thời gian
    @Query("SELECT m FROM Meeting m " +
            "WHERE m.chatRoom.roomId = :roomId " +
            "AND m.startTime BETWEEN :startDate AND :endDate " +
            "ORDER BY m.startTime ASC")
    List<Meeting> findMeetingsInDateRange(
            @Param("roomId") Long roomId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);
}
