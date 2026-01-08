package DoAn.BE.chat.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import DoAn.BE.chat.entity.MessageReaction;

@Repository
public interface MessageReactionRepository extends JpaRepository<MessageReaction, Long> {

    // Lấy tất cả reactions của 1 message (với user để hiển thị tên)
    @EntityGraph(attributePaths = { "user" })
    List<MessageReaction> findByMessage_MessageId(Long messageId);

    // Kiểm tra user đã react emoji này chưa
    boolean existsByMessage_MessageIdAndUser_UserIdAndEmoji(Long messageId, Long userId, String emoji);

    // Lấy reaction cụ thể để xóa
    Optional<MessageReaction> findByMessage_MessageIdAndUser_UserIdAndEmoji(Long messageId, Long userId, String emoji);

    // Xóa reaction (bulk delete)
    @Modifying
    @Query("DELETE FROM MessageReaction r WHERE r.message.messageId = :messageId AND r.user.userId = :userId AND r.emoji = :emoji")
    int deleteByMessageIdAndUserIdAndEmoji(@Param("messageId") Long messageId, @Param("userId") Long userId,
            @Param("emoji") String emoji);

    // Đếm số reactions theo emoji cho 1 message
    @Query("SELECT r.emoji, COUNT(r) FROM MessageReaction r WHERE r.message.messageId = :messageId GROUP BY r.emoji")
    List<Object[]> countReactionsByEmoji(@Param("messageId") Long messageId);
}
