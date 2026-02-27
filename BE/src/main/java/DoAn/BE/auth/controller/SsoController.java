package DoAn.BE.auth.controller;

import DoAn.BE.auth.dto.SsoDto;
import DoAn.BE.auth.service.SsoService;
import DoAn.BE.user.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import DoAn.BE.common.service.AccessControlService;

import java.util.List;

// Controller for SSO/SAML provider management
@Slf4j
@RestController
@RequestMapping("/api/auth/sso")
@RequiredArgsConstructor
@Tag(name = "SSO", description = "Single Sign-On provider management")
public class SsoController {

    private final SsoService ssoService;
    private final AccessControlService accessControlService;

    @GetMapping("/providers/{companyId}/default")
    @Operation(summary = "Get default SSO provider for company", description = "Returns the default SSO provider for login button")
    public ResponseEntity<SsoDto.ProviderResponse> getDefaultProvider(@PathVariable Long companyId) {
        SsoDto.ProviderResponse provider = ssoService.getDefaultProvider(companyId);
        if (provider == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(provider);
    }

    @GetMapping("/login/{providerId}")
    @Operation(summary = "Initiate SSO login", description = "Returns URL to redirect user to IdP")
    public ResponseEntity<SsoDto.LoginInitResponse> initiateLogin(@PathVariable Long providerId) {
        SsoDto.LoginInitResponse response = ssoService.initiateLogin(providerId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/providers")
    @Operation(summary = "List SSO providers", description = "Get all SSO providers for current company")
    public ResponseEntity<List<SsoDto.ProviderResponse>> getProviders() {
        accessControlService.checkAdminPermission(null);
        List<SsoDto.ProviderResponse> providers = ssoService.getProviders();
        return ResponseEntity.ok(providers);
    }

    @GetMapping("/providers/{providerId}")
    @Operation(summary = "Get SSO provider details")
    public ResponseEntity<SsoDto.ProviderResponse> getProvider(@PathVariable Long providerId) {
        accessControlService.checkAdminPermission(null);
        SsoDto.ProviderResponse provider = ssoService.getProvider(providerId);
        return ResponseEntity.ok(provider);
    }

    @PostMapping("/providers")
    @Operation(summary = "Create SSO provider", description = "Configure a new SSO/SAML provider for the company")
    public ResponseEntity<SsoDto.ProviderResponse> createProvider(
            @Valid @RequestBody SsoDto.CreateProviderRequest request,
            @AuthenticationPrincipal User currentUser) {
        accessControlService.checkAdminPermission(null);

        SsoDto.ProviderResponse provider = ssoService.createProvider(request);
        return ResponseEntity.ok(provider);
    }

    @PutMapping("/providers/{providerId}")
    @Operation(summary = "Update SSO provider")
    public ResponseEntity<SsoDto.ProviderResponse> updateProvider(
            @PathVariable Long providerId,
            @Valid @RequestBody SsoDto.UpdateProviderRequest request) {
        accessControlService.checkAdminPermission(null);

        SsoDto.ProviderResponse provider = ssoService.updateProvider(providerId, request);
        return ResponseEntity.ok(provider);
    }

    @DeleteMapping("/providers/{providerId}")
    @Operation(summary = "Delete SSO provider")
    public ResponseEntity<Void> deleteProvider(@PathVariable Long providerId) {
        accessControlService.checkAdminPermission(null);
        ssoService.deleteProvider(providerId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/callback")
    @Operation(summary = "SSO callback", description = "Handle IdP response (SAML assertion or OAuth2 code)")
    public ResponseEntity<SsoDto.SsoAuthResult> handleCallback(
            @RequestParam(required = false) String SAMLResponse,
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state) {

        if (SAMLResponse != null) {
            log.info("Received SAMLResponse (Base64 length): {}", SAMLResponse.length());
        } else if (code != null) {
            log.info("Received OAuth code: {}", code);
        }

        // Return a structured error/info response since we can't fully validate without
        // the library
        // This allows the frontend to at least show a "Received" status
        return ResponseEntity.ok(SsoDto.SsoAuthResult.builder()
                .success(false)
                .errorMessage(
                        "SSO Callback received but processing requires 'spring-security-saml2-service-provider' (removed due to repo issues). "
                                +
                                "Payload received: " + (SAMLResponse != null ? "SAML" : "OAuth"))
                .userCreated(false)
                .build());
    }
}
