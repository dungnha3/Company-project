package DoAn.BE.auth.repository;

import DoAn.BE.auth.entity.LoginAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface LoginAttemptRepository extends JpaRepository<LoginAttempt, Long> {
    
    @Query("SELECT COUNT(la) FROM LoginAttempt la WHERE la.username = :username AND la.attemptedAt > :since AND la.success = false")
    long countFailedAttemptsByUsername(@Param("username") String username, @Param("since") LocalDateTime since);
    
    @Query("SELECT COUNT(la) FROM LoginAttempt la WHERE la.ipAddress = :ipAddress AND la.attemptedAt > :since AND la.success = false")
    long countFailedAttemptsByIpAddress(@Param("ipAddress") String ipAddress, @Param("since") LocalDateTime since);
    
    @Query("SELECT la FROM LoginAttempt la WHERE la.username = :username AND la.attemptedAt > :since ORDER BY la.attemptedAt DESC")
    List<LoginAttempt> findRecentAttemptsByUsername(@Param("username") String username, @Param("since") LocalDateTime since);
    
    @Query("SELECT la FROM LoginAttempt la WHERE la.ipAddress = :ipAddress AND la.attemptedAt > :since ORDER BY la.attemptedAt DESC")
    List<LoginAttempt> findRecentAttemptsByIpAddress(@Param("ipAddress") String ipAddress, @Param("since") LocalDateTime since);
    
    @Query("SELECT COUNT(la) FROM LoginAttempt la WHERE la.username = :username AND la.attemptedAt > :since")
    long countTotalAttemptsByUsername(@Param("username") String username, @Param("since") LocalDateTime since);
    
    @Query("SELECT COUNT(la) FROM LoginAttempt la WHERE la.ipAddress = :ipAddress AND la.attemptedAt > :since")
    long countTotalAttemptsByIpAddress(@Param("ipAddress") String ipAddress, @Param("since") LocalDateTime since);
    
    @Query("SELECT la FROM LoginAttempt la WHERE la.attemptedAt < :cutoffTime")
    List<LoginAttempt> findOldAttempts(@Param("cutoffTime") LocalDateTime cutoffTime);
    
    @Query("SELECT COUNT(la) FROM LoginAttempt la WHERE (la.username = :username OR la.ipAddress = :ipAddress) AND la.attemptedAt > :since AND la.success = false")
    long countRecentFailedAttempts(@Param("username") String username, @Param("ipAddress") String ipAddress, @Param("since") LocalDateTime since);
    
    void deleteByUsernameAndIpAddress(String username, String ipAddress);
}



