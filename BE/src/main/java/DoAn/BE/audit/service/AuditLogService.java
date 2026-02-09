package DoAn.BE.audit.service;

import DoAn.BE.audit.entity.AuditLog;
import DoAn.BE.audit.repository.AuditLogRepository;
import DoAn.BE.user.entity.User;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

// Service quản lý audit logs

// Sử dụng @Async để không block main thread
@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    // Log thao tác của user (async)
    @Async
    @Transactional
    public void logAction(User actor, String action, String entityType, Long entityId,
            Object oldValue, Object newValue,
            AuditLog.Severity severity, String ipAddress, String userAgent) {
        try {
            AuditLog log = new AuditLog();
            log.setActor(actor);
            log.setAction(action);
            log.setEntityType(entityType);
            log.setEntityId(entityId);
            log.setSeverity(severity);
            log.setIpAddress(ipAddress);
            log.setUserAgent(userAgent);
            log.setStatus(AuditLog.Status.SUCCESS);

            // Convert objects to JSON
            if (oldValue != null) {
                log.setOldValue(objectMapper.writeValueAsString(oldValue));
            }
            if (newValue != null) {
                log.setNewValue(objectMapper.writeValueAsString(newValue));
            }

            auditLogRepository.save(log);
            AuditLogService.log.info("✅ Audit log created: {} by {} on {} #{}", action, actor.getUsername(), entityType,
                    entityId);

        } catch (Exception e) {
            log.error("❌ Failed to create audit log: {}", e.getMessage(), e);
        }
    }

    // Log thao tác Admin trên Manager account (CRITICAL)
    @Async
    @Transactional
    public void logAdminActionOnManager(User admin, User targetManager, String action,
            Object oldValue, Object newValue,
            String reason, String ipAddress, String userAgent) {
        try {
            AuditLog log = new AuditLog();
            log.setActor(admin);
            log.setTargetUser(targetManager);
            log.setAction(action);
            log.setEntityType("USER");
            log.setEntityId(targetManager.getUserId());
            log.setSeverity(AuditLog.Severity.CRITICAL);
            log.setReason(reason);
            log.setIpAddress(ipAddress);
            log.setUserAgent(userAgent);
            log.setStatus(AuditLog.Status.SUCCESS);

            if (oldValue != null) {
                log.setOldValue(objectMapper.writeValueAsString(oldValue));
            }
            if (newValue != null) {
                log.setNewValue(objectMapper.writeValueAsString(newValue));
            }

            auditLogRepository.save(log);
            AuditLogService.log.warn("⚠️ CRITICAL: Admin {} performed {} on Manager {} (ID: {})",
                    admin.getUsername(), action, targetManager.getUsername(), targetManager.getUserId());

        } catch (Exception e) {
            log.error("❌ Failed to log critical action: {}", e.getMessage(), e);
        }
    }

    // Log failed action
    @Async
    @Transactional
    public void logFailedAction(User actor, String action, String entityType, Long entityId,
            String errorMessage, String ipAddress, String userAgent) {
        try {
            AuditLog log = new AuditLog();
            log.setActor(actor);
            log.setAction(action);
            log.setEntityType(entityType);
            log.setEntityId(entityId);
            log.setSeverity(AuditLog.Severity.WARNING);
            log.setStatus(AuditLog.Status.FAILED);
            log.setErrorMessage(errorMessage);
            log.setIpAddress(ipAddress);
            log.setUserAgent(userAgent);

            auditLogRepository.save(log);
            AuditLogService.log.warn("⚠️ Failed action logged: {} by {}", action, actor.getUsername());

        } catch (Exception e) {
            log.error("❌ Failed to log failed action: {}", e.getMessage(), e);
        }
    }

    // Lấy audit logs của actor
    @Transactional(readOnly = true)
    public Page<AuditLog> getLogsByActor(Long actorId, Pageable pageable) {
        return auditLogRepository.findByActor_UserId(actorId, pageable);
    }

    // Lấy audit logs về target user
    @Transactional(readOnly = true)
    public Page<AuditLog> getLogsByTargetUser(Long targetUserId, Pageable pageable) {
        return auditLogRepository.findByTargetUser_UserId(targetUserId, pageable);
    }

    // Lấy critical logs trong khoảng thời gian
    @Transactional(readOnly = true)
    public Page<AuditLog> getCriticalLogs(LocalDateTime startDate, LocalDateTime endDate, Pageable pageable) {
        return auditLogRepository.findCriticalLogsBetween(startDate, endDate, pageable);
    }

    // Lấy tất cả Admin actions trên Manager accounts
    @Transactional(readOnly = true)
    public Page<AuditLog> getAdminActionsOnManagers(Pageable pageable) {
        return auditLogRepository.findAdminActionsOnManagers(pageable);
    }

    // Lấy recent logs
    @Transactional(readOnly = true)
    public Page<AuditLog> getRecentLogs(Pageable pageable) {
        return auditLogRepository.findAllLogs(pageable);
    }
}
