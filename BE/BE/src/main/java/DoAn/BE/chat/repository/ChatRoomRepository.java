package DoAn.BE.chat.repository;

import DoAn.BE.chat.entity.ChatRoom;
import DoAn.BE.project.entity.Project;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {
    List<ChatRoom> findByProject(Project project);
    List<ChatRoom> findByCreatedBy_UserId(Long userId);
    Optional<ChatRoom> findByRoomId(Long roomId);

    // Tìm phòng chat 1-1 giữa 2 người
    @Query("SELECT cr FROM ChatRoom cr " +
           "JOIN cr.members m1 JOIN cr.members m2 " +
           "WHERE cr.type = 'DIRECT' " +
           "AND m1.user.userId = :userId1 AND m2.user.userId = :userId2 " +
           "AND SIZE(cr.members) = 2")
    Optional<ChatRoom> findDirectChatBetweenUsers(@Param("userId1") Long userId1, 
                                                  @Param("userId2") Long userId2);

    // Lấy danh sách phòng chat của user
    @Query("SELECT DISTINCT cr FROM ChatRoom cr " +
           "JOIN cr.members m WHERE m.user.userId = :userId " +
           "ORDER BY cr.createdAt DESC")
    List<ChatRoom> findChatRoomsByUserId(@Param("userId") Long userId);

    List<ChatRoom> findByType(ChatRoom.RoomType type);
}


