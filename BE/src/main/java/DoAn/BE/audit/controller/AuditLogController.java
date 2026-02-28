package DoAn.BE.audit.controller;

import DoAn.BE.audit.dto.AuditLogDTO;
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
    public ResponseEntity<Page<AuditLogDTO>> getRecentLogs(Pageable pageable) {
        accessControlService.checkAdminPermission();
        Page<AuditLogDTO> logs = auditLogService.getRecentLogs(pageable).map(AuditLogDTO::fromEntity);
        return ResponseEntity.ok(logs);
    }

    // GET /api/audit-logs/actor/{actorId}
    @GetMapping("/actor/{actorId}")
    public ResponseEntity<Page<AuditLogDTO>> getLogsByActor(
            @PathVariable Long actorId,
            Pageable pageable) {
        accessControlService.checkAdminPermission();
        Page<AuditLogDTO> logs = auditLogService.getLogsByActor(actorId, pageable).map(AuditLogDTO::fromEntity);
        return ResponseEntity.ok(logs);
    }

    // GET /api/audit-logs/target/{targetUserId}
    @GetMapping("/target/{targetUserId}")
    public ResponseEntity<Page<AuditLogDTO>> getLogsByTargetUser(
            @PathVariable Long targetUserId,
            Pageable pageable) {
        accessControlService.checkAdminPermission();
        Page<AuditLogDTO> logs = auditLogService.getLogsByTargetUser(targetUserId, pageable)
                .map(AuditLogDTO::fromEntity);
        return ResponseEntity.ok(logs);
    }

    // GET /api/audit-logs/critical
    @GetMapping("/critical")
    public ResponseEntity<Page<AuditLogDTO>> getCriticalLogs(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            Pageable pageable) {
        accessControlService.checkAdminPermission();
        Page<AuditLogDTO> logs = auditLogService.getCriticalLogs(startDate, endDate, pageable)
                .map(AuditLogDTO::fromEntity);
        return ResponseEntity.ok(logs);
    }

    // GET /api/audit-logs/admin-on-managers
    @GetMapping("/admin-on-managers")
    public ResponseEntity<Page<AuditLogDTO>> getAdminActionsOnManagers(Pageable pageable) {
        accessControlService.checkAdminPermission();
        Page<AuditLogDTO> logs = auditLogService.getAdminActionsOnManagers(pageable).map(AuditLogDTO::fromEntity);
        return ResponseEntity.ok(logs);
    }
}
