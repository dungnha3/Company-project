package DoAn.BE.audit.controller;

import DoAn.BE.audit.entity.AuditLog;
import DoAn.BE.audit.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import DoAn.BE.common.service.AccessControlService;
import java.time.LocalDateTime;


// Chỉ Admin có quyền truy cập
@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogService auditLogService;
    private final AccessControlService accessControlService;

    // GET /api/audit-logs
    @GetMapping
    public ResponseEntity<Page<AuditLog>> getRecentLogs(Pageable pageable) {
        accessControlService.checkAdminPermission(null);
        Page<AuditLog> logs = auditLogService.getRecentLogs(pageable);
        return ResponseEntity.ok(logs);
    }

    // GET /api/audit-logs/actor/{actorId}
    @GetMapping("/actor/{actorId}")
    public ResponseEntity<Page<AuditLog>> getLogsByActor(
            @PathVariable Long actorId,
            Pageable pageable) {
        accessControlService.checkAdminPermission(null);
        Page<AuditLog> logs = auditLogService.getLogsByActor(actorId, pageable);
        return ResponseEntity.ok(logs);
    }

    // GET /api/audit-logs/target/{targetUserId}
    @GetMapping("/target/{targetUserId}")
    public ResponseEntity<Page<AuditLog>> getLogsByTargetUser(
            @PathVariable Long targetUserId,
            Pageable pageable) {
        accessControlService.checkAdminPermission(null);
        Page<AuditLog> logs = auditLogService.getLogsByTargetUser(targetUserId, pageable);
        return ResponseEntity.ok(logs);
    }

    // GET /api/audit-logs/critical
    @GetMapping("/critical")
    public ResponseEntity<Page<AuditLog>> getCriticalLogs(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            Pageable pageable) {
        accessControlService.checkAdminPermission(null);
        Page<AuditLog> logs = auditLogService.getCriticalLogs(startDate, endDate, pageable);
        return ResponseEntity.ok(logs);
    }

    // GET /api/audit-logs/admin-on-managers
    @GetMapping("/admin-on-managers")
    public ResponseEntity<Page<AuditLog>> getAdminActionsOnManagers(Pageable pageable) {
        accessControlService.checkAdminPermission(null);
        Page<AuditLog> logs = auditLogService.getAdminActionsOnManagers(pageable);
        return ResponseEntity.ok(logs);
    }
}
