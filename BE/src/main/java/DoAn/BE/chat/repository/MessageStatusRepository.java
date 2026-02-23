package DoAn.BE.chat.repository;

import DoAn.BE.chat.entity.MessageStatus;
import DoAn.BE.chat.entity.MessageStatusId;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface MessageStatusRepository extends JpaRepository<MessageStatus, MessageStatusId> {
    List<MessageStatus> findByMessage_MessageId(Long messageId);

    List<MessageStatus> findByMessage_MessageIdAndStatus(Long messageId, MessageStatus.MessageStatusType status);

    List<MessageStatus> findByUser_UserId(Long userId);

    // [Đếm số tin nhắn chưa đọc trong phòng chat cho user] (Role: System)
    @Query("SELECT COUNT(m) FROM Message m " +
            "LEFT JOIN MessageStatus ms ON m.messageId = ms.message.messageId AND ms.user.userId = :userId " +
            "WHERE m.chatRoom.roomId = :roomId " +
            "AND m.sender.userId != :userId " +
            "AND (ms.status IS NULL OR ms.status != 'SEEN')")
    Long countUnreadMessagesInRoom(@Param("roomId") Long roomId, @Param("userId") Long userId);

    // [OPTIMIZED: Bulk update for markAllMessagesAsSeen]
    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE MessageStatus ms SET ms.status = 'SEEN', ms.timestamp = :now " +
            "WHERE ms.user.userId = :userId " +
            "AND ms.message.chatRoom.roomId = :roomId " +
            "AND ms.status != 'SEEN'")
    int markAllAsSeenInRoom(@Param("roomId") Long roomId, @Param("userId") Long userId,
            @Param("now") java.time.LocalDateTime now);
}
