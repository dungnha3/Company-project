package DoAn.BE.audit.controller;

import DoAn.BE.audit.entity.AuditLog;
import DoAn.BE.audit.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Controller quản lý Audit Logs
 * Chỉ Admin có quyền truy cập
 */
@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AuditLogController {

    private final AuditLogService auditLogService;

    /**
     * GET /api/audit-logs
     * Lấy danh sách audit logs gần đây
     */
    @GetMapping
    public ResponseEntity<List<AuditLog>> getRecentLogs() {
        List<AuditLog> logs = auditLogService.getRecentLogs();
        return ResponseEntity.ok(logs);
    }

    /**
     * GET /api/audit-logs/actor/{actorId}
     * Lấy audit logs theo actor (user thực hiện hành động)
     */
    @GetMapping("/actor/{actorId}")
    public ResponseEntity<List<AuditLog>> getLogsByActor(@PathVariable Long actorId) {
        List<AuditLog> logs = auditLogService.getLogsByActor(actorId);
        return ResponseEntity.ok(logs);
    }

    /**
     * GET /api/audit-logs/target/{targetUserId}
     * Lấy audit logs theo target user (user bị thao tác)
     */
    @GetMapping("/target/{targetUserId}")
    public ResponseEntity<List<AuditLog>> getLogsByTargetUser(@PathVariable Long targetUserId) {
        List<AuditLog> logs = auditLogService.getLogsByTargetUser(targetUserId);
        return ResponseEntity.ok(logs);
    }

    /**
     * GET /api/audit-logs/critical
     * Lấy các critical logs trong khoảng thời gian
     */
    @GetMapping("/critical")
    public ResponseEntity<List<AuditLog>> getCriticalLogs(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        List<AuditLog> logs = auditLogService.getCriticalLogs(startDate, endDate);
        return ResponseEntity.ok(logs);
    }

    /**
     * GET /api/audit-logs/admin-on-managers
     * Lấy tất cả hành động của Admin trên Manager accounts
     */
    @GetMapping("/admin-on-managers")
    public ResponseEntity<List<AuditLog>> getAdminActionsOnManagers() {
        List<AuditLog> logs = auditLogService.getAdminActionsOnManagers();
        return ResponseEntity.ok(logs);
    }
}
