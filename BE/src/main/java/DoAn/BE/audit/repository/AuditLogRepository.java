package DoAn.BE.audit.repository;

import DoAn.BE.audit.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    @EntityGraph(attributePaths = { "actor", "targetUser" })
    Page<AuditLog> findByActor_UserId(Long actorId, Pageable pageable);

    @EntityGraph(attributePaths = { "actor", "targetUser" })
    Page<AuditLog> findByTargetUser_UserId(Long targetUserId, Pageable pageable);

    @EntityGraph(attributePaths = { "actor", "targetUser" })
    Page<AuditLog> findByAction(String action, Pageable pageable);

    @EntityGraph(attributePaths = { "actor", "targetUser" })
    Page<AuditLog> findBySeverity(AuditLog.Severity severity, Pageable pageable);

    @EntityGraph(attributePaths = { "actor", "targetUser" })
    @Query("SELECT a FROM AuditLog a WHERE a.severity = 'CRITICAL' " +
            "AND a.createdAt BETWEEN :startDate AND :endDate")
    Page<AuditLog> findCriticalLogsBetween(@Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate, Pageable pageable);

    @EntityGraph(attributePaths = { "actor", "targetUser" })
    @Query("SELECT a FROM AuditLog a")
    Page<AuditLog> findAllLogs(Pageable pageable);
}
