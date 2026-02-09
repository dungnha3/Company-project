package DoAn.BE.project.service;

import DoAn.BE.common.context.TenantContext;
import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.company.entity.Company;
import DoAn.BE.project.dto.CustomFieldDto;
import DoAn.BE.project.entity.IssueCustomField;
import DoAn.BE.project.entity.IssueCustomField.FieldType;
import DoAn.BE.project.entity.IssueCustomFieldValue;
import DoAn.BE.project.entity.Issue;
import DoAn.BE.project.entity.Project;
import DoAn.BE.project.repository.IssueCustomFieldRepository;
import DoAn.BE.project.repository.IssueCustomFieldValueRepository;
import DoAn.BE.project.repository.IssueRepository;
import DoAn.BE.project.repository.ProjectRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for managing custom fields
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CustomFieldService {

    private final IssueCustomFieldRepository fieldRepository;
    private final IssueCustomFieldValueRepository valueRepository;
    private final ProjectRepository projectRepository;
    private final IssueRepository issueRepository;
    private final ObjectMapper objectMapper;

    private static final int MAX_CUSTOM_FIELDS_PER_PROJECT = 50;

    // ==================== FIELD MANAGEMENT ====================

    /**
     * Get all custom fields for a project
     */
    public List<CustomFieldDto.Response> getFieldsByProject(Long projectId) {
        List<IssueCustomField> fields = fieldRepository
                .findByProject_ProjectIdAndIsActiveTrueOrderByDisplayOrderAsc(projectId);

        return fields.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Create a new custom field for a project
     */
    @Transactional
    public CustomFieldDto.Response createField(Long projectId, CustomFieldDto.CreateRequest request) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        // Check limit
        long currentCount = fieldRepository.countByProject_ProjectIdAndIsActiveTrue(projectId);
        if (currentCount >= MAX_CUSTOM_FIELDS_PER_PROJECT) {
            throw new BadRequestException("Maximum " + MAX_CUSTOM_FIELDS_PER_PROJECT + " custom fields per project");
        }

        // Check duplicate name
        if (fieldRepository.findByProject_ProjectIdAndNameIgnoreCase(projectId, request.getName()).isPresent()) {
            throw new BadRequestException("A field with this name already exists");
        }

        // Validate options for SELECT types
        if ((request.getFieldType() == FieldType.SELECT || request.getFieldType() == FieldType.MULTI_SELECT)
                && (request.getOptions() == null || request.getOptions().isEmpty())) {
            throw new BadRequestException("Options are required for SELECT field types");
        }

        // Get next display order
        Integer maxOrder = fieldRepository.findMaxDisplayOrderByProjectId(projectId);

        IssueCustomField field = IssueCustomField.builder()
                .project(project)
                .company(createCompanyRef())
                .name(request.getName())
                .description(request.getDescription())
                .fieldType(request.getFieldType())
                .options(serializeOptions(request.getOptions()))
                .isRequired(request.getIsRequired() != null ? request.getIsRequired() : false)
                .defaultValue(request.getDefaultValue())
                .displayOrder(maxOrder + 1)
                .isActive(true)
                .build();

        field = fieldRepository.save(field);
        log.info("Created custom field '{}' for project {}", field.getName(), projectId);

        return toResponse(field);
    }

    /**
     * Update an existing custom field
     */
    @Transactional
    public CustomFieldDto.Response updateField(Long fieldId, CustomFieldDto.UpdateRequest request) {
        IssueCustomField field = fieldRepository.findById(fieldId)
                .orElseThrow(() -> new ResourceNotFoundException("Custom field not found"));

        // Check duplicate name if changed
        if (request.getName() != null && !request.getName().equalsIgnoreCase(field.getName())) {
            if (fieldRepository.findByProject_ProjectIdAndNameIgnoreCase(
                    field.getProject().getProjectId(), request.getName()).isPresent()) {
                throw new BadRequestException("A field with this name already exists");
            }
            field.setName(request.getName());
        }

        if (request.getDescription() != null) {
            field.setDescription(request.getDescription());
        }

        if (request.getOptions() != null) {
            field.setOptions(serializeOptions(request.getOptions()));
        }

        if (request.getIsRequired() != null) {
            field.setIsRequired(request.getIsRequired());
        }

        if (request.getDefaultValue() != null) {
            field.setDefaultValue(request.getDefaultValue());
        }

        if (request.getDisplayOrder() != null) {
            field.setDisplayOrder(request.getDisplayOrder());
        }

        if (request.getIsActive() != null) {
            field.setIsActive(request.getIsActive());
        }

        field = fieldRepository.save(field);
        log.info("Updated custom field {}", fieldId);

        return toResponse(field);
    }

    /**
     * Delete a custom field (soft delete)
     */
    @Transactional
    public void deleteField(Long fieldId) {
        IssueCustomField field = fieldRepository.findById(fieldId)
                .orElseThrow(() -> new ResourceNotFoundException("Custom field not found"));

        field.setIsActive(false);
        fieldRepository.save(field);

        log.info("Deleted (soft) custom field {}", fieldId);
    }

    /**
     * Reorder custom fields
     */
    @Transactional
    public void reorderFields(Long projectId, List<Long> fieldIds) {
        for (int i = 0; i < fieldIds.size(); i++) {
            fieldRepository.findById(fieldIds.get(i)).ifPresent(field -> {
                field.setDisplayOrder(fieldIds.indexOf(field.getFieldId()));
                fieldRepository.save(field);
            });
        }
    }

    // ==================== VALUE MANAGEMENT ====================

    /**
     * Get all custom field values for an issue
     */
    public List<CustomFieldDto.ValueResponse> getValuesByIssue(Long issueId) {
        List<IssueCustomFieldValue> values = valueRepository.findByIssue_IssueId(issueId);

        return values.stream()
                .map(this::toValueResponse)
                .collect(Collectors.toList());
    }

    /**
     * Set custom field values for an issue (batch update)
     */
    @Transactional
    public void setValues(Long issueId, List<CustomFieldDto.ValueRequest> requests) {
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new ResourceNotFoundException("Issue not found"));

        for (CustomFieldDto.ValueRequest request : requests) {
            IssueCustomField field = fieldRepository.findById(request.getFieldId())
                    .orElseThrow(
                            () -> new ResourceNotFoundException("Custom field not found: " + request.getFieldId()));

            // Validate required
            if (field.getIsRequired() && request.getValue() == null) {
                throw new BadRequestException("Field '" + field.getName() + "' is required");
            }

            // Find or create value
            IssueCustomFieldValue value = valueRepository
                    .findByIssue_IssueIdAndCustomField_FieldId(issueId, request.getFieldId())
                    .orElse(IssueCustomFieldValue.builder()
                            .issue(issue)
                            .customField(field)
                            .build());

            // Set typed value
            setTypedValue(value, field.getFieldType(), request.getValue());

            valueRepository.save(value);
        }

        log.debug("Updated {} custom field values for issue {}", requests.size(), issueId);
    }

    // ==================== HELPER METHODS ====================

    private void setTypedValue(IssueCustomFieldValue value, FieldType fieldType, Object rawValue) {
        if (rawValue == null) {
            value.setStringValue(null);
            value.setNumberValue(null);
            value.setDateValue(null);
            value.setDatetimeValue(null);
            value.setBooleanValue(null);
            value.setUserValue(null);
            return;
        }

        switch (fieldType) {
            case TEXT, TEXTAREA, SELECT, URL ->
                value.setStringValue(rawValue.toString());

            case MULTI_SELECT -> {
                if (rawValue instanceof List<?> list) {
                    value.setStringValue(serializeOptions(list.stream()
                            .map(Object::toString)
                            .collect(Collectors.toList())));
                } else {
                    value.setStringValue(rawValue.toString());
                }
            }

            case NUMBER -> {
                if (rawValue instanceof Number n) {
                    value.setNumberValue(new BigDecimal(n.toString()));
                } else {
                    value.setNumberValue(new BigDecimal(rawValue.toString()));
                }
            }

            case DATE -> {
                if (rawValue instanceof LocalDate d) {
                    value.setDateValue(d);
                } else {
                    value.setDateValue(LocalDate.parse(rawValue.toString()));
                }
            }

            case DATETIME -> {
                if (rawValue instanceof LocalDateTime dt) {
                    value.setDatetimeValue(dt);
                } else {
                    value.setDatetimeValue(LocalDateTime.parse(rawValue.toString()));
                }
            }

            case CHECKBOX -> {
                if (rawValue instanceof Boolean b) {
                    value.setBooleanValue(b);
                } else {
                    value.setBooleanValue(Boolean.parseBoolean(rawValue.toString()));
                }
            }

            case USER -> {
                if (rawValue instanceof Number n) {
                    value.setUserValue(n.longValue());
                } else {
                    value.setUserValue(Long.parseLong(rawValue.toString()));
                }
            }
        }
    }

    private CustomFieldDto.Response toResponse(IssueCustomField field) {
        return CustomFieldDto.Response.builder()
                .fieldId(field.getFieldId())
                .projectId(field.getProject().getProjectId())
                .name(field.getName())
                .description(field.getDescription())
                .fieldType(field.getFieldType())
                .options(deserializeOptions(field.getOptions()))
                .isRequired(field.getIsRequired())
                .defaultValue(field.getDefaultValue())
                .displayOrder(field.getDisplayOrder())
                .isActive(field.getIsActive())
                .build();
    }

    private CustomFieldDto.ValueResponse toValueResponse(IssueCustomFieldValue value) {
        IssueCustomField field = value.getCustomField();
        Object displayValue = value.getValue();

        // Format display value based on type
        String formatted = displayValue != null ? displayValue.toString() : null;

        return CustomFieldDto.ValueResponse.builder()
                .valueId(value.getValueId())
                .fieldId(field.getFieldId())
                .fieldName(field.getName())
                .fieldType(field.getFieldType())
                .value(displayValue)
                .displayValue(formatted)
                .build();
    }

    private String serializeOptions(List<String> options) {
        if (options == null || options.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(options);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize options", e);
            return null;
        }
    }

    private List<String> deserializeOptions(String json) {
        if (json == null || json.isEmpty()) {
            return new ArrayList<>();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {
            });
        } catch (JsonProcessingException e) {
            log.error("Failed to deserialize options", e);
            return new ArrayList<>();
        }
    }

    private Company createCompanyRef() {
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null) {
            throw new BadRequestException("Company context not set");
        }
        Company company = new Company();
        company.setCompanyId(companyId);
        return company;
    }
}
