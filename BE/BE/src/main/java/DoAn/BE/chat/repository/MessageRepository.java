package DoAn.BE.chat.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import DoAn.BE.chat.entity.Message;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

       // [OPTIMIZED: Fetch with sender for message list display]
       @EntityGraph(attributePaths = { "sender" })
       List<Message> findByChatRoom_RoomIdOrderByCreatedAtAsc(Long roomId);

       // [OPTIMIZED: Fetch with sender for last message preview]
       @EntityGraph(attributePaths = { "sender" })
       Message findTopByChatRoom_RoomIdOrderByCreatedAtDesc(Long roomId);

       List<Message> findBySender_UserId(Long userId);

       @Query("SELECT COUNT(m) FROM Message m " +
                     "JOIN m.chatRoom cr JOIN cr.members cm " +
                     "WHERE cr.roomId = :roomId AND cm.user.userId = :userId " +
                     "AND m.createdAt > :lastReadAt AND m.sender.userId != :userId")
       Long countUnreadMessages(@Param("roomId") Long roomId,
                     @Param("userId") Long userId,
                     @Param("lastReadAt") LocalDateTime lastReadAt);

       // [OPTIMIZED: Fetch with sender for search results]
       @EntityGraph(attributePaths = { "sender" })
       @Query("SELECT m FROM Message m WHERE m.chatRoom.roomId = :roomId AND " +
                     "LOWER(m.content) LIKE LOWER(CONCAT('%', :keyword, '%')) AND " +
                     "m.isDeleted = false ORDER BY m.createdAt DESC")
       List<Message> searchMessagesByContent(@Param("roomId") Long roomId, @Param("keyword") String keyword);

       // ==================== PAGINATED QUERIES ====================

       // [PAGINATED: For large chat rooms - load messages in chunks]
       @EntityGraph(attributePaths = { "sender" })
       @Query("SELECT m FROM Message m WHERE m.chatRoom.roomId = :roomId AND m.isDeleted = false ORDER BY m.createdAt DESC")
       Page<Message> findByRoomIdPaged(@Param("roomId") Long roomId, Pageable pageable);

       // [PAGINATED: Load messages before a specific message (infinite scroll)]
       @EntityGraph(attributePaths = { "sender" })
       @Query("SELECT m FROM Message m WHERE m.chatRoom.roomId = :roomId AND m.createdAt < :before " +
                     "AND m.isDeleted = false ORDER BY m.createdAt DESC")
       Page<Message> findByRoomIdBeforeTime(@Param("roomId") Long roomId,
                     @Param("before") LocalDateTime before, Pageable pageable);
}
