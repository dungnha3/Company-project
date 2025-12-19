package DoAn.BE.ai.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import DoAn.BE.ai.entity.AIConversation;

@Repository
public interface AIConversationRepository extends JpaRepository<AIConversation, Long> {
    
    Optional<AIConversation> findByConversationUuid(String conversationUuid);
    
    List<AIConversation> findByUser_UserIdAndIsActiveTrueOrderByLastMessageAtDesc(Long userId);
    
    Page<AIConversation> findByUser_UserIdAndIsActiveTrueOrderByLastMessageAtDesc(Long userId, Pageable pageable);
    
    List<AIConversation> findByUser_UserIdAndProject_ProjectIdAndIsActiveTrueOrderByLastMessageAtDesc(
            Long userId, Long projectId);
    
    @Query("SELECT c FROM AIConversation c WHERE c.user.userId = :userId AND c.isActive = true " +
           "AND (c.title LIKE %:keyword% OR EXISTS (SELECT m FROM AIMessage m WHERE m.conversation = c AND m.content LIKE %:keyword%))")
    Page<AIConversation> searchByKeyword(@Param("userId") Long userId, @Param("keyword") String keyword, Pageable pageable);
    
    @Query("SELECT COUNT(c) FROM AIConversation c WHERE c.user.userId = :userId AND c.isActive = true")
    long countActiveByUserId(@Param("userId") Long userId);
    
    @Query("SELECT c FROM AIConversation c LEFT JOIN FETCH c.messages WHERE c.conversationUuid = :uuid")
    Optional<AIConversation> findByConversationUuidWithMessages(@Param("uuid") String uuid);
}
