package DoAn.BE.audit.dto;

import java.time.LocalDateTime;

import DoAn.BE.audit.entity.AuditLog;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// DTO for AuditLog — prevents leaking raw entity fields like ipAddress and userAgent to non-admin consumers
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogDTO {
    private Long id;
    private String actorUsername;
    private Long actorId;
    private String action;
    private String targetUsername;
    private Long targetUserId;
    private String entityType;
    private Long entityId;
    private String oldValue;
    private String newValue;
    private String reason;
    private AuditLog.Severity severity;
    private AuditLog.Status status;
    private String errorMessage;
    private LocalDateTime createdAt;

    public static AuditLogDTO fromEntity(AuditLog log) {
        return AuditLogDTO.builder()
                .id(log.getId())
                .actorUsername(log.getActor() != null ? log.getActor().getUsername() : null)
                .actorId(log.getActor() != null ? log.getActor().getUserId() : null)
                .action(log.getAction())
                .targetUsername(log.getTargetUser() != null ? log.getTargetUser().getUsername() : null)
                .targetUserId(log.getTargetUser() != null ? log.getTargetUser().getUserId() : null)
                .entityType(log.getEntityType())
                .entityId(log.getEntityId())
                .oldValue(sanitizeAuditValue(log.getOldValue()))
                .newValue(sanitizeAuditValue(log.getNewValue()))
                .reason(log.getReason())
                .severity(log.getSeverity())
                .status(log.getStatus())
                .errorMessage(log.getErrorMessage())
                .createdAt(log.getCreatedAt())
                .build();
    }
    private static String sanitizeAuditValue(String value) {
        if (value == null)
            return null;
        // Remove common sensitive patterns from JSON
        return value
                .replaceAll("\"password\"\\s*:\\s*\"[^\"]*\"", "\"password\":\"[REDACTED]\"")
                .replaceAll("\"passwordHash\"\\s*:\\s*\"[^\"]*\"", "\"passwordHash\":\"[REDACTED]\"")
                .replaceAll("\"token\"\\s*:\\s*\"[^\"]*\"", "\"token\":\"[REDACTED]\"")
                .replaceAll("\"refreshToken\"\\s*:\\s*\"[^\"]*\"", "\"refreshToken\":\"[REDACTED]\"")
                .replaceAll("\"secret\"\\s*:\\s*\"[^\"]*\"", "\"secret\":\"[REDACTED]\"")
                .replaceAll("\"apiKey\"\\s*:\\s*\"[^\"]*\"", "\"apiKey\":\"[REDACTED]\"");
    }
}
