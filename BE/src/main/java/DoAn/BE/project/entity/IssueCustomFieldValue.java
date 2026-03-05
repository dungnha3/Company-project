package DoAn.BE.project.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.*;

// Entity lưu giá trị custom field cho từng issue
// Sử dụng polymorphic storage để lưu nhiều loại dữ liệu
// /
@Entity
@Table(name = "issue_custom_field_values", indexes = {
        @Index(name = "idx_cfv_issue", columnList = "issue_id"),
        @Index(name = "idx_cfv_field", columnList = "field_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_issue_field", columnNames = { "issue_id", "field_id" })
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@Builder
public class IssueCustomFieldValue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "value_id")
    @EqualsAndHashCode.Include
    private Long valueId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "issue_id", nullable = false)
    private Issue issue;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "field_id", nullable = false)
    private IssueCustomField customField;

    // String value for TEXT, TEXTAREA, SELECT, MULTI_SELECT, URL fields
    // For MULTI_SELECT, values are stored as JSON array: ["opt1", "opt2"]
    // /
    @Column(name = "string_value", columnDefinition = "NVARCHAR(MAX)")
    private String stringValue;

    // Numeric value for NUMBER fields
    // /
    @Column(name = "number_value", precision = 18, scale = 4)
    private BigDecimal numberValue;

    // Date value for DATE fields
    // /
    @Column(name = "date_value")
    private LocalDate dateValue;

    // DateTime value for DATETIME fields
    // /
    @Column(name = "datetime_value")
    private LocalDateTime datetimeValue;

    // Boolean value for CHECKBOX fields
    // /
    @Column(name = "boolean_value")
    private Boolean booleanValue;

    // User ID for USER type fields
    // /
    @Column(name = "user_value")
    private Long userValue;

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

    // Get the value based on field type
    // /
    public Object getValue() {
        if (customField == null)
            return null;

        return switch (customField.getFieldType()) {
            case TEXT, TEXTAREA, SELECT, MULTI_SELECT, URL -> stringValue;
            case NUMBER -> numberValue;
            case DATE -> dateValue;
            case DATETIME -> datetimeValue;
            case CHECKBOX -> booleanValue;
            case USER -> userValue;
        };
    }

    // Set value based on field type (auto-detect from input)
    // /
    public void setValue(Object value) {
        if (value == null) {
            clearAllValues();
            return;
        }

        if (value instanceof String s) {
            this.stringValue = s;
        } else if (value instanceof Number n) {
            this.numberValue = new BigDecimal(n.toString());
        } else if (value instanceof LocalDate d) {
            this.dateValue = d;
        } else if (value instanceof LocalDateTime dt) {
            this.datetimeValue = dt;
        } else if (value instanceof Boolean b) {
            this.booleanValue = b;
        }
    }

    private void clearAllValues() {
        this.stringValue = null;
        this.numberValue = null;
        this.dateValue = null;
        this.datetimeValue = null;
        this.booleanValue = null;
        this.userValue = null;
    }
}
