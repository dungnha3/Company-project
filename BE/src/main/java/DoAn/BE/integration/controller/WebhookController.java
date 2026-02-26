package DoAn.BE.integration.controller;

import DoAn.BE.common.context.TenantContext;
import DoAn.BE.integration.dto.WebhookDto;
import DoAn.BE.integration.entity.Integration;
import DoAn.BE.integration.entity.Integration.IntegrationType;
import DoAn.BE.integration.repository.IntegrationRepository;
import DoAn.BE.integration.service.WebhookConnector;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * REST controller for Webhook CRUD operations.
 * Maps the frontend's /api/integration/webhooks endpoints to the Integration
 * entity
 * with GENERIC_WEBHOOK type, storing webhook-specific config as JSON.
 */
@RestController
@RequestMapping("/api/integration/webhooks")
@RequiredArgsConstructor
@Tag(name = "Webhooks", description = "Webhook management for workspace integrations")
@Slf4j
public class WebhookController {

    private final IntegrationRepository integrationRepository;
    private final WebhookConnector webhookConnector;
    private final ObjectMapper objectMapper;

    @GetMapping
    @Operation(summary = "List webhooks", description = "Get all webhooks for the current company")
    public ResponseEntity<List<WebhookDto.WebhookResponse>> list() {
        Long companyId = TenantContext.getCompanyId();
        Optional<Integration> opt = integrationRepository
                .findByCompany_CompanyIdAndIntegrationType(companyId, IntegrationType.GENERIC_WEBHOOK);

        if (opt.isEmpty()) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        Integration integration = opt.get();
        List<WebhookDto.WebhookResponse> webhooks = parseWebhookList(integration);
        return ResponseEntity.ok(webhooks);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Create webhook", description = "Add a new webhook")
    public ResponseEntity<WebhookDto.WebhookResponse> create(
            @Valid @RequestBody WebhookDto.WebhookRequest request) {
        Long companyId = TenantContext.getCompanyId();

        Integration integration = integrationRepository
                .findByCompany_CompanyIdAndIntegrationType(companyId, IntegrationType.GENERIC_WEBHOOK)
                .orElseGet(() -> {
                    Integration newIntegration = Integration.builder()
                            .company(createCompanyRef(companyId))
                            .integrationType(IntegrationType.GENERIC_WEBHOOK)
                            .name("Webhooks")
                            .isActive(true)
                            .build();
                    return integrationRepository.save(newIntegration);
                });

        List<Map<String, Object>> webhookList = deserializeWebhookList(integration.getConfig());

        // Generate an ID for this webhook entry
        long newId = webhookList.stream()
                .mapToLong(w -> ((Number) w.getOrDefault("id", 0L)).longValue())
                .max().orElse(0L) + 1;

        Map<String, Object> webhookEntry = new HashMap<>();
        webhookEntry.put("id", newId);
        webhookEntry.put("url", request.getUrl());
        webhookEntry.put("secret", request.getSecret());
        webhookEntry.put("events", request.getEvents() != null ? request.getEvents() : Collections.emptyList());
        webhookEntry.put("isActive", request.getIsActive() != null ? request.getIsActive() : true);

        webhookList.add(webhookEntry);
        integration.setConfig(serializeWebhookList(webhookList));
        integrationRepository.save(integration);

        return ResponseEntity.ok(toResponse(webhookEntry));
    }

    @DeleteMapping("/{webhookId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Delete webhook", description = "Remove a webhook by its ID")
    public ResponseEntity<Void> delete(@PathVariable Long webhookId) {
        Long companyId = TenantContext.getCompanyId();
        Integration integration = integrationRepository
                .findByCompany_CompanyIdAndIntegrationType(companyId, IntegrationType.GENERIC_WEBHOOK)
                .orElse(null);

        if (integration == null) {
            return ResponseEntity.noContent().build();
        }

        List<Map<String, Object>> webhookList = deserializeWebhookList(integration.getConfig());
        webhookList.removeIf(w -> Objects.equals(((Number) w.get("id")).longValue(), webhookId));
        integration.setConfig(serializeWebhookList(webhookList));
        integrationRepository.save(integration);

        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{webhookId}/test")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Test webhook", description = "Send a test payload to the webhook")
    public ResponseEntity<Map<String, Object>> test(@PathVariable Long webhookId) {
        Long companyId = TenantContext.getCompanyId();
        Integration integration = integrationRepository
                .findByCompany_CompanyIdAndIntegrationType(companyId, IntegrationType.GENERIC_WEBHOOK)
                .orElseThrow(() -> new RuntimeException("No webhooks configured"));

        List<Map<String, Object>> webhookList = deserializeWebhookList(integration.getConfig());
        Map<String, Object> webhook = webhookList.stream()
                .filter(w -> Objects.equals(((Number) w.get("id")).longValue(), webhookId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Webhook not found"));

        String url = (String) webhook.get("url");
        Map<String, Object> testPayload = Map.of(
                "event", "test",
                "message", "This is a test webhook from your workspace",
                "timestamp", System.currentTimeMillis());

        boolean success = webhookConnector.sendGenericWebhook(url, testPayload);

        Map<String, Object> result = new HashMap<>();
        result.put("success", success);
        result.put("webhookId", webhookId);
        return ResponseEntity.ok(result);
    }

    // ==================== Helper methods ====================

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> deserializeWebhookList(String json) {
        if (json == null || json.isBlank())
            return new ArrayList<>();
        try {
            return objectMapper.readValue(json, new TypeReference<List<Map<String, Object>>>() {
            });
        } catch (JsonProcessingException e) {
            log.warn("Failed to parse webhook config JSON, returning empty list");
            return new ArrayList<>();
        }
    }

    private String serializeWebhookList(List<Map<String, Object>> list) {
        try {
            return objectMapper.writeValueAsString(list);
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }

    private List<WebhookDto.WebhookResponse> parseWebhookList(Integration integration) {
        List<Map<String, Object>> list = deserializeWebhookList(integration.getConfig());
        return list.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @SuppressWarnings("unchecked")
    private WebhookDto.WebhookResponse toResponse(Map<String, Object> entry) {
        return WebhookDto.WebhookResponse.builder()
                .id(((Number) entry.getOrDefault("id", 0)).longValue())
                .url((String) entry.get("url"))
                .secret((String) entry.get("secret"))
                .events(entry.get("events") instanceof List ? (List<String>) entry.get("events")
                        : Collections.emptyList())
                .isActive(entry.get("isActive") instanceof Boolean ? (Boolean) entry.get("isActive") : true)
                .build();
    }

    private DoAn.BE.company.entity.Company createCompanyRef(Long companyId) {
        DoAn.BE.company.entity.Company company = new DoAn.BE.company.entity.Company();
        company.setCompanyId(companyId);
        return company;
    }
}
