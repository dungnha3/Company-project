package DoAn.BE.integration.controller;

import DoAn.BE.integration.dto.IntegrationDto;
import DoAn.BE.integration.service.IntegrationService;
import DoAn.BE.user.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import DoAn.BE.common.service.AccessControlService;

import java.util.List;

// Controller for integration marketplace and management
// /
@RestController
@RequestMapping("/api/integrations")
@RequiredArgsConstructor
@Tag(name = "Integrations", description = "Third-party integration marketplace and management")
public class IntegrationController {

    private final IntegrationService integrationService;
    private final AccessControlService accessControlService;

    @GetMapping("/available")
    @Operation(summary = "List available integrations", description = "Get all available integrations with connection status")
    public ResponseEntity<List<IntegrationDto.AvailableIntegration>> getAvailableIntegrations() {
        List<IntegrationDto.AvailableIntegration> integrations = integrationService.getAvailableIntegrations();
        return ResponseEntity.ok(integrations);
    }

    @GetMapping
    @Operation(summary = "List connected integrations", description = "Get all integrations connected to current company")
    public ResponseEntity<List<IntegrationDto.IntegrationResponse>> getConnectedIntegrations() {
        List<IntegrationDto.IntegrationResponse> integrations = integrationService.getConnectedIntegrations();
        return ResponseEntity.ok(integrations);
    }

    @PostMapping("/connect")
    @Operation(summary = "Connect integration", description = "Connect a new integration to the company")
    public ResponseEntity<IntegrationDto.IntegrationResponse> connect(
            @Valid @RequestBody IntegrationDto.ConnectRequest request,
            @AuthenticationPrincipal User currentUser) {
        accessControlService.checkAdminPermission(null);

        IntegrationDto.IntegrationResponse integration = integrationService.connect(request, currentUser);
        return ResponseEntity.ok(integration);
    }

    @PutMapping("/{integrationId}")
    @Operation(summary = "Update integration", description = "Update integration configuration")
    public ResponseEntity<IntegrationDto.IntegrationResponse> update(
            @PathVariable Long integrationId,
            @Valid @RequestBody IntegrationDto.UpdateRequest request) {
        accessControlService.checkAdminPermission(null);

        IntegrationDto.IntegrationResponse integration = integrationService.update(integrationId, request);
        return ResponseEntity.ok(integration);
    }

    @DeleteMapping("/{integrationId}")
    @Operation(summary = "Disconnect integration", description = "Remove integration from company")
    public ResponseEntity<Void> disconnect(@PathVariable Long integrationId) {
        accessControlService.checkAdminPermission(null);
        integrationService.disconnect(integrationId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{integrationId}/test")
    @Operation(summary = "Test integration", description = "Test integration connection")
    public ResponseEntity<IntegrationDto.SyncStatus> testConnection(@PathVariable Long integrationId) {
        accessControlService.checkAdminPermission(null);
        IntegrationDto.SyncStatus status = integrationService.testConnection(integrationId);
        return ResponseEntity.ok(status);
    }
}
