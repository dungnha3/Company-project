package DoAn.BE.auth.entity;

import DoAn.BE.company.entity.Company;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

// Entity for storing SSO/SAML provider configurations per company
// /
@Entity
@Table(name = "sso_providers", indexes = {
        @Index(name = "idx_sso_company", columnList = "company_id"),
        @Index(name = "idx_sso_type", columnList = "provider_type")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SsoProvider {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "provider_id")
    private Long providerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(name = "name", nullable = false, length = 100)
    private String name; // e.g., "Okta", "Azure AD", "Google Workspace"

    @Enumerated(EnumType.STRING)
    @Column(name = "provider_type", nullable = false, length = 20)
    private ProviderType providerType;

    @Column(name = "entity_id", nullable = false, length = 500)
    private String entityId; // IdP Entity ID

    @Column(name = "sso_url", nullable = false, length = 1000)
    private String ssoUrl; // Single Sign-On URL

    @Column(name = "slo_url", length = 1000)
    private String sloUrl; // Single Logout URL (optional)

    @Column(name = "certificate", columnDefinition = "TEXT")
    private String certificate; // X.509 Certificate for signature verification

    @Column(name = "metadata_url", length = 1000)
    private String metadataUrl; // IdP Metadata URL for auto-config

    @Column(name = "attribute_mappings", columnDefinition = "TEXT")
    private String attributeMappings; // JSON: {"email": "emailAddress", "name": "displayName"}

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "is_default")
    @Builder.Default
    private Boolean isDefault = false; // Default provider for company

    @Column(name = "allow_Password_login")
    @Builder.Default
    private Boolean allowPasswordLogin = true; // Allow fallback to password login

    @Column(name = "auto_provision_users")
    @Builder.Default
    private Boolean autoProvisionUsers = true; // Auto-create users on first SSO login

    @Column(name = "default_role", length = 50)
    private String defaultRole; // Role for auto-provisioned users

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

    public enum ProviderType {
        SAML, // SAML 2.0
        OIDC, // OpenID Connect
        OAUTH2 // OAuth 2.0 (Google, etc.)
    }
}
