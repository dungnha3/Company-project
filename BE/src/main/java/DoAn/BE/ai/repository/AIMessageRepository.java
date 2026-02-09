package DoAn.BE.ai.repository;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import DoAn.BE.ai.entity.AIMessage;

@Repository
public interface AIMessageRepository extends JpaRepository<AIMessage, Long> {
    
    List<AIMessage> findByConversation_IdOrderByCreatedAtAsc(Long conversationId);
    
    @Query("SELECT m FROM AIMessage m WHERE m.conversation.id = :conversationId ORDER BY m.createdAt DESC")
    List<AIMessage> findRecentMessages(@Param("conversationId") Long conversationId, Pageable pageable);
    
    @Query("SELECT m FROM AIMessage m WHERE m.conversation.conversationUuid = :uuid ORDER BY m.createdAt ASC")
    List<AIMessage> findByConversationUuid(@Param("uuid") String uuid);
    
    @Query("SELECT COUNT(m) FROM AIMessage m WHERE m.conversation.id = :conversationId")
    long countByConversationId(@Param("conversationId") Long conversationId);
    
    @Query("SELECT SUM(m.tokensUsed) FROM AIMessage m WHERE m.conversation.user.userId = :userId")
    Long getTotalTokensUsedByUser(@Param("userId") Long userId);
}
