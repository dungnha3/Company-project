package DoAn.BE.project.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.*;
import lombok.*;

import DoAn.BE.company.entity.Company;

// Entity định nghĩa custom field cho project
// Cho phép mỗi project có các trường tùy chỉnh riêng (giống Jira custom fields)
// /
@Entity
@Table(name = "issue_custom_fields", indexes = {
        @Index(name = "idx_cf_project", columnList = "project_id"),
        @Index(name = "idx_cf_company", columnList = "company_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@Builder
public class IssueCustomField {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "field_id")
    @EqualsAndHashCode.Include
    private Long fieldId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 255)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "field_type", nullable = false, length = 20)
    private FieldType fieldType;

    // JSON options for SELECT/MULTI_SELECT types
    // Format: ["Option 1", "Option 2", "Option 3"]
    // /
    @Column(columnDefinition = "TEXT")
    private String options;

    @Column(name = "is_required")
    @Builder.Default
    private Boolean isRequired = false;

    @Column(name = "display_order")
    @Builder.Default
    private Integer displayOrder = 0;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "default_value", columnDefinition = "TEXT")
    private String defaultValue;

    @OneToMany(mappedBy = "customField", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<IssueCustomFieldValue> values = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Enum định nghĩa loại custom field
    // /
    public enum FieldType {
        TEXT, // Short text (single line)
        TEXTAREA, // Long text (multi-line)
        NUMBER, // Numeric value
        DATE, // Date only
        DATETIME, // Date and time
        SELECT, // Single select dropdown
        MULTI_SELECT, // Multiple select
        CHECKBOX, // Boolean checkbox
        URL, // URL link
        USER // User selector
    }
}
