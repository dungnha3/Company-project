package DoAn.BE.chat.repository;

import DoAn.BE.chat.entity.MeetingParticipant;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


import java.util.List;
import java.util.Optional;

@Repository
public interface MeetingParticipantRepository extends JpaRepository<MeetingParticipant, Long> {

    // [OPTIMIZED: Fetch with User to avoid N+1]
    @EntityGraph(attributePaths = { "user" })
    List<MeetingParticipant> findByMeeting_MeetingId(Long meetingId);

    Optional<MeetingParticipant> findByMeeting_MeetingIdAndUser_UserId(Long meetingId, Long userId);
}
