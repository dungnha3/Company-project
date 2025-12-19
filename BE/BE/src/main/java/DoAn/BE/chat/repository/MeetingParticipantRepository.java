package DoAn.BE.chat.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import DoAn.BE.chat.entity.MeetingParticipant;

@Repository
public interface MeetingParticipantRepository extends JpaRepository<MeetingParticipant, Long> {

    List<MeetingParticipant> findByMeeting_MeetingId(Long meetingId);

    Optional<MeetingParticipant> findByMeeting_MeetingIdAndUser_UserId(Long meetingId, Long userId);

    boolean existsByMeeting_MeetingIdAndUser_UserId(Long meetingId, Long userId);

    void deleteByMeeting_MeetingIdAndUser_UserId(Long meetingId, Long userId);
}
