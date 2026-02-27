package DoAn.BE.project.dto;

import DoAn.BE.project.entity.IssueCustomField.FieldType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.List;

// DTOs for Custom Field operations
// /
public class CustomFieldDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateRequest {
        @NotBlank(message = "Field name is required")
        @Size(max = 100, message = "Field name must be less than 100 characters")
        private String name;

        @Size(max = 255, message = "Description must be less than 255 characters")
        private String description;

        @NotNull(message = "Field type is required")
        private FieldType fieldType;

        // Options for SELECT/MULTI_SELECT types
        // /
        private List<String> options;

        @Builder.Default
        private Boolean isRequired = false;

        private String defaultValue;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UpdateRequest {
        @Size(max = 100, message = "Field name must be less than 100 characters")
        private String name;

        @Size(max = 255, message = "Description must be less than 255 characters")
        private String description;

        private List<String> options;

        private Boolean isRequired;

        private String defaultValue;

        private Integer displayOrder;

        private Boolean isActive;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {
        private Long fieldId;
        private Long projectId;
        private String name;
        private String description;
        private FieldType fieldType;
        private List<String> options;
        private Boolean isRequired;
        private String defaultValue;
        private Integer displayOrder;
        private Boolean isActive;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ValueRequest {
        @NotNull(message = "Field ID is required")
        private Long fieldId;

        // Value can be:
        // - String for TEXT, TEXTAREA, SELECT, URL
        // - Number for NUMBER
        // - "2024-01-15" for DATE
        // - true/false for CHECKBOX
        // - userId for USER
        // - ["opt1", "opt2"] for MULTI_SELECT
        // /
        private Object value;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ValueResponse {
        private Long valueId;
        private Long fieldId;
        private String fieldName;
        private FieldType fieldType;
        private Object value;
        private String displayValue; // Formatted for UI
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReorderRequest {
        private List<Long> fieldIds; // Ordered list of field IDs
    }
}
