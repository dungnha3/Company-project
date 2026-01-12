package DoAn.BE.integration.entity;

import DoAn.BE.common.converter.EncryptedStringConverter;
import DoAn.BE.company.entity.Company;
import DoAn.BE.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entity for storing third-party integrations per company
 */
@Entity
@Table(name = "integrations", indexes = {
        @Index(name = "idx_integration_company", columnList = "company_id"),
        @Index(name = "idx_integration_type", columnList = "integration_type")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_company_integration", columnNames = { "company_id", "integration_type" })
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Integration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "integration_id")
    private Long integrationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Enumerated(EnumType.STRING)
    @Column(name = "integration_type", nullable = false, length = 50)
    private IntegrationType integrationType;

    @Column(name = "name", length = 100)
    private String name; // Custom name for this integration

    @Column(name = "config", columnDefinition = "TEXT")
    @Convert(converter = EncryptedStringConverter.class)
    private String config; // Encrypted JSON config (tokens, webhooks, etc.)

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "last_sync_at")
    private LocalDateTime lastSyncAt;

    @Column(name = "last_error", length = 1000)
    private String lastError;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "connected_by")
    private User connectedBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Supported integration types
     */
    public enum IntegrationType {
        // Communication
        SLACK,
        MICROSOFT_TEAMS,
        DISCORD,

        // Calendar & Productivity
        GOOGLE_CALENDAR,
        OUTLOOK_CALENDAR,
        GOOGLE_DRIVE,

        // Project Management
        JIRA_IMPORT,
        TRELLO_IMPORT,

        // HR & Payroll
        GOOGLE_WORKSPACE,

        // Webhooks
        GENERIC_WEBHOOK
    }
}
