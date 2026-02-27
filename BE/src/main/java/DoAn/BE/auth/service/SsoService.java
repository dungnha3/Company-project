package DoAn.BE.auth.service;

import DoAn.BE.auth.dto.SsoDto;
import DoAn.BE.auth.entity.SsoProvider;
import DoAn.BE.auth.repository.SsoProviderRepository;
import DoAn.BE.common.context.TenantContext;
import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.company.entity.Company;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

// Service for managing SSO providers
// /
@Service
@RequiredArgsConstructor
@Slf4j
public class SsoService {

    private final SsoProviderRepository providerRepository;
    private final ObjectMapper objectMapper;

    private static final int MAX_PROVIDERS_PER_COMPANY = 5;

    // Get all SSO providers for current company
    // /
    @Transactional(readOnly = true)
    public List<SsoDto.ProviderResponse> getProviders() {
        Long companyId = TenantContext.getCompanyId();
        return providerRepository.findByCompany_CompanyIdAndIsActiveTrue(companyId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // Get provider by ID
    // /
    @Transactional(readOnly = true)
    public SsoDto.ProviderResponse getProvider(Long providerId) {
        SsoProvider provider = findProviderSecure(providerId);
        return toResponse(provider);
    }

    // Create new SSO provider
    // /
    @Transactional
    public SsoDto.ProviderResponse createProvider(SsoDto.CreateProviderRequest request) {
        Long companyId = TenantContext.getCompanyId();

        // Check limit
        if (providerRepository.countByCompany_CompanyId(companyId) >= MAX_PROVIDERS_PER_COMPANY) {
            throw new BadRequestException("Maximum " + MAX_PROVIDERS_PER_COMPANY + " SSO providers per company");
        }

        // Check duplicate name
        if (providerRepository.existsByCompany_CompanyIdAndName(companyId, request.getName())) {
            throw new BadRequestException("Provider with name '" + request.getName() + "' already exists");
        }

        SsoProvider provider = SsoProvider.builder()
                .company(createCompanyRef(companyId))
                .name(request.getName())
                .providerType(request.getProviderType())
                .entityId(request.getEntityId())
                .ssoUrl(request.getSsoUrl())
                .sloUrl(request.getSloUrl())
                .certificate(request.getCertificate())
                .metadataUrl(request.getMetadataUrl())
                .attributeMappings(serializeMap(request.getAttributeMappings()))
                .allowPasswordLogin(request.getAllowPasswordLogin())
                .autoProvisionUsers(request.getAutoProvisionUsers())
                .defaultRole(request.getDefaultRole())
                .isActive(true)
                .isDefault(false)
                .build();

        provider = providerRepository.save(provider);
        log.info("Created SSO provider '{}' for company {}", provider.getName(), companyId);

        return toResponse(provider);
    }

    // Update SSO provider
    // /
    @Transactional
    public SsoDto.ProviderResponse updateProvider(Long providerId, SsoDto.UpdateProviderRequest request) {
        SsoProvider provider = findProviderSecure(providerId);

        if (request.getName() != null) {
            provider.setName(request.getName());
        }
        if (request.getSsoUrl() != null) {
            provider.setSsoUrl(request.getSsoUrl());
        }
        if (request.getSloUrl() != null) {
            provider.setSloUrl(request.getSloUrl());
        }
        if (request.getCertificate() != null) {
            provider.setCertificate(request.getCertificate());
        }
        if (request.getAttributeMappings() != null) {
            provider.setAttributeMappings(serializeMap(request.getAttributeMappings()));
        }
        if (request.getIsActive() != null) {
            provider.setIsActive(request.getIsActive());
        }
        if (request.getIsDefault() != null && request.getIsDefault()) {
            // Remove default from other providers
            providerRepository.findByCompany_CompanyIdAndIsDefaultTrue(provider.getCompany().getCompanyId())
                    .ifPresent(p -> {
                        p.setIsDefault(false);
                        providerRepository.save(p);
                    });
            provider.setIsDefault(true);
        }
        if (request.getAllowPasswordLogin() != null) {
            provider.setAllowPasswordLogin(request.getAllowPasswordLogin());
        }
        if (request.getAutoProvisionUsers() != null) {
            provider.setAutoProvisionUsers(request.getAutoProvisionUsers());
        }
        if (request.getDefaultRole() != null) {
            provider.setDefaultRole(request.getDefaultRole());
        }

        provider = providerRepository.save(provider);
        log.info("Updated SSO provider {}", providerId);

        return toResponse(provider);
    }

    // Delete SSO provider
    // /
    @Transactional
    public void deleteProvider(Long providerId) {
        SsoProvider provider = findProviderSecure(providerId);
        providerRepository.delete(provider);
        log.info("Deleted SSO provider {}", providerId);
    }

    // Initiate SSO login - returns URL to redirect user to IdP
    // /
    public SsoDto.LoginInitResponse initiateLogin(Long providerId) {
        SsoProvider provider = findProviderSecure(providerId);

        if (!provider.getIsActive()) {
            throw new BadRequestException("SSO provider is not active");
        }

        String requestId = UUID.randomUUID().toString();

        // For SAML, generate AuthnRequest and redirect
        // For OIDC/OAuth2, build authorization URL
        String loginUrl = buildLoginUrl(provider, requestId);

        return SsoDto.LoginInitResponse.builder()
                .loginUrl(loginUrl)
                .requestId(requestId)
                .providerName(provider.getName())
                .build();
    }

    // Get default provider for company (for "Login with SSO" button)
    // /
    @Transactional(readOnly = true)
    public SsoDto.ProviderResponse getDefaultProvider(Long companyId) {
        return providerRepository.findByCompany_CompanyIdAndIsDefaultTrue(companyId)
                .map(this::toResponse)
                .orElse(null);
    }

    private String buildLoginUrl(SsoProvider provider, String requestId) {
        switch (provider.getProviderType()) {
            case SAML:
                return provider.getSsoUrl() + "?SAMLRequest=" + requestId;
            case OIDC:
            case OAUTH2:
                return provider.getSsoUrl() + "?state=" + requestId + "&redirect_uri=/api/auth/sso/callback";
            default:
                return provider.getSsoUrl();
        }
    }

    private SsoProvider findProviderSecure(Long providerId) {
        Long companyId = TenantContext.getCompanyId();
        return providerRepository.findByProviderIdAndCompany_CompanyId(providerId, companyId)
                .orElseThrow(() -> new ResourceNotFoundException("SSO provider not found"));
    }

    private Company createCompanyRef(Long companyId) {
        Company company = new Company();
        company.setCompanyId(companyId);
        return company;
    }

    private SsoDto.ProviderResponse toResponse(SsoProvider provider) {
        return SsoDto.ProviderResponse.builder()
                .providerId(provider.getProviderId())
                .name(provider.getName())
                .providerType(provider.getProviderType())
                .entityId(provider.getEntityId())
                .ssoUrl(provider.getSsoUrl())
                .isActive(provider.getIsActive())
                .isDefault(provider.getIsDefault())
                .allowPasswordLogin(provider.getAllowPasswordLogin())
                .autoProvisionUsers(provider.getAutoProvisionUsers())
                .defaultRole(provider.getDefaultRole())
                .createdAt(provider.getCreatedAt())
                .build();
    }

    private String serializeMap(Map<String, String> map) {
        if (map == null)
            return null;
        try {
            return objectMapper.writeValueAsString(map);
        } catch (JsonProcessingException e) {
            return null;
        }
    }
}
