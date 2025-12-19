package DoAn.BE.auth.repository;

import DoAn.BE.auth.entity.UserSession;
import DoAn.BE.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserSessionRepository extends JpaRepository<UserSession, Long> {
    
    Optional<UserSession> findBySessionId(String sessionId);
    
    List<UserSession> findByUserAndIsActiveTrue(User user);
    
    @Query("SELECT us FROM UserSession us WHERE us.user = :user AND us.isActive = true AND us.lastActivity > :cutoffTime")
    List<UserSession> findActiveSessionsByUser(@Param("user") User user, @Param("cutoffTime") LocalDateTime cutoffTime);
    
    @Modifying
    @Query("UPDATE UserSession us SET us.isActive = false WHERE us.user = :user")
    void deactivateAllSessionsByUser(@Param("user") User user);
    
    @Modifying
    @Query("UPDATE UserSession us SET us.isActive = false WHERE us.sessionId = :sessionId")
    void deactivateSession(@Param("sessionId") String sessionId);
    
    @Modifying
    @Query("UPDATE UserSession us SET us.lastActivity = :now WHERE us.sessionId = :sessionId")
    void updateLastActivity(@Param("sessionId") String sessionId, @Param("now") LocalDateTime now);
    
    @Modifying
    @Query("DELETE FROM UserSession us WHERE us.lastActivity < :cutoffTime")
    void deleteExpiredSessions(@Param("cutoffTime") LocalDateTime cutoffTime);
    
    @Query("SELECT COUNT(us) FROM UserSession us WHERE us.user = :user AND us.isActive = true")
    long countActiveSessionsByUser(@Param("user") User user);
    
    @Query("SELECT us FROM UserSession us WHERE us.ipAddress = :ipAddress AND us.isActive = true")
    List<UserSession> findActiveSessionsByIpAddress(@Param("ipAddress") String ipAddress);
}











