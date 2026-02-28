package DoAn.BE.audit.repository;

import DoAn.BE.audit.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

       // Tìm audit logs theo actor (Paginated)
       Page<AuditLog> findByActor_UserId(Long actorId, Pageable pageable);

       // Tìm audit logs theo target user (Paginated)
       Page<AuditLog> findByTargetUser_UserId(Long targetUserId, Pageable pageable);

       // Tìm audit logs theo action (Paginated)
       Page<AuditLog> findByAction(String action, Pageable pageable);

       // Tìm audit logs theo severity (Paginated)
       Page<AuditLog> findBySeverity(AuditLog.Severity severity, Pageable pageable);

       // Tìm critical logs trong khoảng thời gian (Paginated)
       @Query("SELECT a FROM AuditLog a WHERE a.severity = 'CRITICAL' " +
                     "AND a.createdAt BETWEEN :startDate AND :endDate")
       Page<AuditLog> findCriticalLogsBetween(@Param("startDate") LocalDateTime startDate,
                     @Param("endDate") LocalDateTime endDate, Pageable pageable);
       @Query("SELECT DISTINCT a FROM AuditLog a " +
                     "JOIN a.actor.memberships mActor " +
                     "LEFT JOIN a.targetUser.memberships mTarget " +
                     "WHERE 'ADMIN' MEMBER OF mActor.roles " +
                     "AND a.targetUser IS NOT NULL " +
                     "AND ('MANAGER_HR' MEMBER OF mTarget.roles OR 'MANAGER_ACCOUNTING' MEMBER OF mTarget.roles OR 'MANAGER_PROJECT' MEMBER OF mTarget.roles)")
       Page<AuditLog> findAdminActionsOnManagers(Pageable pageable);
       @org.springframework.data.jpa.repository.EntityGraph(attributePaths = { "actor", "targetUser" })
       @Query("SELECT a FROM AuditLog a")
       Page<AuditLog> findAllLogs(Pageable pageable);
}
