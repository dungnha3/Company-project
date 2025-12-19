package DoAn.BE.chat.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import DoAn.BE.chat.entity.Message;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
       List<Message> findByChatRoom_RoomIdOrderBySentAtAsc(Long roomId);

       // Get the last message in a room
       Message findTopByChatRoom_RoomIdOrderBySentAtDesc(Long roomId);

       List<Message> findBySender_UserId(Long userId);

       @Query("SELECT COUNT(m) FROM Message m " +
                     "JOIN m.chatRoom cr JOIN cr.members cm " +
                     "WHERE cr.roomId = :roomId AND cm.user.userId = :userId " +
                     "AND m.sentAt > :lastReadAt AND m.sender.userId != :userId")
       Long countUnreadMessages(@Param("roomId") Long roomId,
                     @Param("userId") Long userId,
                     @Param("lastReadAt") LocalDateTime lastReadAt);

       // Search messages by content
       @Query("SELECT m FROM Message m WHERE m.chatRoom.roomId = :roomId AND " +
                     "LOWER(m.content) LIKE LOWER(CONCAT('%', :keyword, '%')) AND " +
                     "m.isDeleted = false ORDER BY m.sentAt DESC")
       List<Message> searchMessagesByContent(@Param("roomId") Long roomId, @Param("keyword") String keyword);

       // Search messages by sender
       @Query("SELECT m FROM Message m WHERE m.chatRoom.roomId = :roomId AND " +
                     "LOWER(m.sender.username) LIKE LOWER(CONCAT('%', :keyword, '%')) AND " +
                     "m.isDeleted = false ORDER BY m.sentAt DESC")
       List<Message> searchMessagesBySender(@Param("roomId") Long roomId, @Param("keyword") String keyword);

       // Search messages by date range
       @Query("SELECT m FROM Message m WHERE m.chatRoom.roomId = :roomId AND " +
                     "m.sentAt BETWEEN :startDate AND :endDate AND " +
                     "m.isDeleted = false ORDER BY m.sentAt DESC")
       List<Message> searchMessagesByDateRange(@Param("roomId") Long roomId,
                     @Param("startDate") LocalDateTime startDate,
                     @Param("endDate") LocalDateTime endDate);

       // Search messages by type
       @Query("SELECT m FROM Message m WHERE m.chatRoom.roomId = :roomId AND " +
                     "m.messageType = :messageType AND m.isDeleted = false ORDER BY m.sentAt DESC")
       List<Message> searchMessagesByType(@Param("roomId") Long roomId,
                     @Param("messageType") Message.MessageType messageType);
}
