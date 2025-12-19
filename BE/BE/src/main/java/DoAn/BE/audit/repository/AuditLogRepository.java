package DoAn.BE.audit.repository;

import DoAn.BE.audit.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    
    // Tìm audit logs theo actor
    List<AuditLog> findByActor_UserId(Long actorId);
    
    // Tìm audit logs theo target user
    List<AuditLog> findByTargetUser_UserId(Long targetUserId);
    
    // Tìm audit logs theo action
    List<AuditLog> findByAction(String action);
    
    // Tìm audit logs theo severity
    List<AuditLog> findBySeverity(AuditLog.Severity severity);
    
    // Tìm critical logs trong khoảng thời gian
    @Query("SELECT a FROM AuditLog a WHERE a.severity = 'CRITICAL' " +
           "AND a.createdAt BETWEEN :startDate AND :endDate " +
           "ORDER BY a.createdAt DESC")
    List<AuditLog> findCriticalLogsBetween(@Param("startDate") LocalDateTime startDate, 
                                            @Param("endDate") LocalDateTime endDate);
    
    // Tìm tất cả actions của Admin trên Manager accounts
    @Query("SELECT a FROM AuditLog a WHERE a.actor.role = 'ADMIN' " +
           "AND a.targetUser.role IN ('MANAGER_HR', 'MANAGER_ACCOUNTING', 'MANAGER_PROJECT') " +
           "ORDER BY a.createdAt DESC")
    List<AuditLog> findAdminActionsOnManagers();
    
    // Tìm recent logs (50 records gần nhất)
    @Query("SELECT a FROM AuditLog a ORDER BY a.createdAt DESC")
    List<AuditLog> findRecentLogs();
}
