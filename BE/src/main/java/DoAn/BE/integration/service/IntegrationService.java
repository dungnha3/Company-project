package DoAn.BE.integration.service;

import DoAn.BE.common.context.TenantContext;
import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.company.entity.Company;
import DoAn.BE.integration.dto.IntegrationDto;
import DoAn.BE.integration.entity.Integration;
import DoAn.BE.integration.entity.Integration.IntegrationType;
import DoAn.BE.integration.repository.IntegrationRepository;
import DoAn.BE.user.entity.User;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import DoAn.BE.common.config.CacheConfig;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for managing third-party integrations
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class IntegrationService {

    private final IntegrationRepository integrationRepository;
    private final ObjectMapper objectMapper;
    private final WebhookConnector webhookConnector; // New field

    private static final int MAX_INTEGRATIONS = 10;

    // ==================== MARKETPLACE ====================

    /**
     * Get all available integrations with connection status
     */
    public List<IntegrationDto.AvailableIntegration> getAvailableIntegrations() {
        Long companyId = TenantContext.getCompanyId();
        Set<IntegrationType> connectedTypes = integrationRepository.findByCompany_CompanyId(companyId)
                .stream()
                .map(Integration::getIntegrationType)
                .collect(Collectors.toSet());

        return Arrays.stream(IntegrationType.values())
                .map(type -> buildAvailableIntegration(type, connectedTypes.contains(type)))
                .collect(Collectors.toList());
    }

    // ==================== INTEGRATION MANAGEMENT ====================

    /**
     * Get all connected integrations for current company
     */
    @Transactional(readOnly = true)
    public List<IntegrationDto.IntegrationResponse> getConnectedIntegrations() {
        Long companyId = TenantContext.getCompanyId();
        return integrationRepository.findByCompany_CompanyId(companyId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Connect a new integration
     */
    @Transactional
    @CacheEvict(value = CacheConfig.CACHE_INTEGRATIONS, key = "#companyId")
    public IntegrationDto.IntegrationResponse connect(IntegrationDto.ConnectRequest request, User currentUser) {
        Long companyId = TenantContext.getCompanyId();

        // Check if already connected
        if (integrationRepository.existsByCompany_CompanyIdAndIntegrationType(companyId,
                request.getIntegrationType())) {
            throw new BadRequestException("Integration already connected. Update or disconnect first.");
        }

        // Check limit
        if (integrationRepository.countByCompany_CompanyId(companyId) >= MAX_INTEGRATIONS) {
            throw new BadRequestException("Maximum " + MAX_INTEGRATIONS + " integrations per company");
        }

        Integration integration = Integration.builder()
                .company(createCompanyRef(companyId))
                .integrationType(request.getIntegrationType())
                .name(request.getName() != null ? request.getName() : request.getIntegrationType().name())
                .config(serializeConfig(request.getConfig()))
                .isActive(true)
                .connectedBy(currentUser)
                .build();

        integration = integrationRepository.save(integration);
        log.info("Connected integration {} for company {}", request.getIntegrationType(), companyId);

        return toResponse(integration);
    }

    /**
     * Update integration config
     */
    @Transactional
    @CacheEvict(value = CacheConfig.CACHE_INTEGRATIONS, key = "#integration.company.companyId")
    public IntegrationDto.IntegrationResponse update(Long integrationId, IntegrationDto.UpdateRequest request) {
        Integration integration = findIntegrationSecure(integrationId);

        if (request.getName() != null) {
            integration.setName(request.getName());
        }
        if (request.getConfig() != null) {
            // Merge with existing config
            Map<String, String> existingConfig = deserializeConfig(integration.getConfig());
            existingConfig.putAll(request.getConfig());
            integration.setConfig(serializeConfig(existingConfig));
        }
        if (request.getIsActive() != null) {
            integration.setIsActive(request.getIsActive());
        }

        integration = integrationRepository.save(integration);
        log.info("Updated integration {}", integrationId);

        return toResponse(integration);
    }

    /**
     * Disconnect (delete) integration
     */
    @Transactional
    @CacheEvict(value = CacheConfig.CACHE_INTEGRATIONS, key = "#integration.company.companyId")
    public void disconnect(Long integrationId) {
        Integration integration = findIntegrationSecure(integrationId);
        integrationRepository.delete(integration);
        log.info("Disconnected integration {}: {}", integrationId, integration.getIntegrationType());
    }

    /**
     * Test integration connection
     */
    public IntegrationDto.SyncStatus testConnection(Long integrationId) {
        Integration integration = findIntegrationSecure(integrationId);
        Map<String, String> config = deserializeConfig(integration.getConfig());
        boolean success = false;
        String error = null;

        try {
            switch (integration.getIntegrationType()) {
                case SLACK:
                    String slackUrl = config.get("webhookUrl");
                    if (slackUrl != null) {
                        success = webhookConnector.sendSlackNotification(slackUrl,
                                "Test connection from Company Project", "Connection Successful");
                    } else {
                        error = "Missing webhookUrl";
                    }
                    break;
                case DISCORD:
                    String discordUrl = config.get("webhookUrl");
                    if (discordUrl != null) {
                        success = webhookConnector.sendDiscordNotification(discordUrl,
                                "Test connection from Company Project", "Connection Successful");
                    } else {
                        error = "Missing webhookUrl";
                    }
                    break;
                case GENERIC_WEBHOOK:
                    String genericUrl = config.get("webhookUrl");
                    if (genericUrl != null) {
                        Map<String, Object> data = new HashMap<>();
                        data.put("event", "test_connection");
                        data.put("timestamp", LocalDateTime.now().toString());
                        success = webhookConnector.sendGenericWebhook(genericUrl, data);
                    } else {
                        error = "Missing webhookUrl";
                    }
                    break;
                default:
                    // For others, we still return mock success for now
                    success = true;
                    break;
            }
        } catch (Exception e) {
            success = false;
            error = e.getMessage();
        }

        return IntegrationDto.SyncStatus.builder()
                .integrationId(integrationId)
                .type(integration.getIntegrationType())
                .isRunning(false)
                .lastRunAt(LocalDateTime.now())
                .itemsSynced(0)
                .error(success ? null : (error != null ? error : "Connection failed"))
                .build();
    }

    /**
     * Send notification to all connected integrations of a specific type
     */
    @Async
    public void notifyIntegrations(IntegrationType type, String title, String message, Map<String, Object> extraData) {
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null)
            return;

        List<Integration> integrations = getActiveIntegrationsCached(companyId);

        for (Integration integration : integrations) {
            if (!integration.getIsActive() || integration.getIntegrationType() != type) {
                continue;
            }

            Map<String, String> config = deserializeConfig(integration.getConfig());
            String webhookUrl = config.get("webhookUrl");

            if (webhookUrl == null)
                continue;

            switch (type) {
                case SLACK:
                    webhookConnector.sendSlackNotification(webhookUrl, message, title);
                    break;
                case DISCORD:
                    webhookConnector.sendDiscordNotification(webhookUrl, message, title);
                    break;
                case GENERIC_WEBHOOK:
                    Map<String, Object> payload = new HashMap<>();
                    payload.put("title", title);
                    payload.put("message", message);
                    if (extraData != null)
                        payload.putAll(extraData);
                    webhookConnector.sendGenericWebhook(webhookUrl, payload);
                    break;
                default:
                    break;
            }
        }
    }

    // ==================== HELPERS ====================

    @Cacheable(value = CacheConfig.CACHE_INTEGRATIONS, key = "#companyId")
    public List<Integration> getActiveIntegrationsCached(Long companyId) {
        return integrationRepository.findByCompany_CompanyId(companyId);
    }

    private IntegrationDto.AvailableIntegration buildAvailableIntegration(IntegrationType type, boolean isConnected) {
        return IntegrationDto.AvailableIntegration.builder()
                .type(type)
                .name(getDisplayName(type))
                .description(getDescription(type))
                .icon(getIcon(type))
                .category(getCategory(type))
                .features(getFeatures(type))
                .isConnected(isConnected)
                .isPremium(isPremium(type))
                .build();
    }

    private String getDisplayName(IntegrationType type) {
        return switch (type) {
            case SLACK -> "Slack";
            case MICROSOFT_TEAMS -> "Microsoft Teams";
            case DISCORD -> "Discord";
            case GOOGLE_CALENDAR -> "Google Calendar";
            case OUTLOOK_CALENDAR -> "Outlook Calendar";
            case GOOGLE_DRIVE -> "Google Drive";
            case JIRA_IMPORT -> "Jira Import";
            case TRELLO_IMPORT -> "Trello Import";
            case GOOGLE_WORKSPACE -> "Google Workspace";
            case GENERIC_WEBHOOK -> "Custom Webhook";
        };
    }

    private String getDescription(IntegrationType type) {
        return switch (type) {
            case SLACK -> "Send notifications to Slack channels";
            case MICROSOFT_TEAMS -> "Integrate with Microsoft Teams";
            case DISCORD -> "Send notifications to Discord servers";
            case GOOGLE_CALENDAR -> "Sync leave requests with Google Calendar";
            case OUTLOOK_CALENDAR -> "Sync leave requests with Outlook";
            case GOOGLE_DRIVE -> "Store and share files via Google Drive";
            case JIRA_IMPORT -> "Import projects and issues from Jira";
            case TRELLO_IMPORT -> "Import boards and cards from Trello";
            case GOOGLE_WORKSPACE -> "User provisioning from Google Workspace";
            case GENERIC_WEBHOOK -> "Send events to custom webhook endpoints";
        };
    }

    private String getIcon(IntegrationType type) {
        return switch (type) {
            case SLACK -> "slack";
            case MICROSOFT_TEAMS -> "microsoft-teams";
            case DISCORD -> "discord";
            case GOOGLE_CALENDAR, GOOGLE_DRIVE, GOOGLE_WORKSPACE -> "google";
            case OUTLOOK_CALENDAR -> "microsoft";
            case JIRA_IMPORT -> "jira";
            case TRELLO_IMPORT -> "trello";
            case GENERIC_WEBHOOK -> "webhook";
        };
    }

    private String getCategory(IntegrationType type) {
        return switch (type) {
            case SLACK, MICROSOFT_TEAMS, DISCORD -> "Communication";
            case GOOGLE_CALENDAR, OUTLOOK_CALENDAR, GOOGLE_DRIVE -> "Productivity";
            case JIRA_IMPORT, TRELLO_IMPORT -> "Project Management";
            case GOOGLE_WORKSPACE -> "HR & Identity";
            case GENERIC_WEBHOOK -> "Developer";
        };
    }

    private List<String> getFeatures(IntegrationType type) {
        return switch (type) {
            case SLACK -> List.of("Issue notifications", "Leave request alerts", "Sprint updates");
            case GOOGLE_CALENDAR -> List.of("Leave sync", "Sprint events", "Meeting reminders");
            case JIRA_IMPORT -> List.of("One-time import", "Projects", "Issues", "Custom fields");
            case GENERIC_WEBHOOK -> List.of("Custom events", "Flexible payload", "HMAC signing");
            default -> List.of("Notifications", "Data sync");
        };
    }

    private boolean isPremium(IntegrationType type) {
        return type == IntegrationType.JIRA_IMPORT ||
                type == IntegrationType.GOOGLE_WORKSPACE ||
                type == IntegrationType.MICROSOFT_TEAMS;
    }

    private Integration findIntegrationSecure(Long integrationId) {
        Long companyId = TenantContext.getCompanyId();
        return integrationRepository.findByIntegrationIdAndCompany_CompanyId(integrationId, companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Integration not found"));
    }

    private Company createCompanyRef(Long companyId) {
        Company company = new Company();
        company.setCompanyId(companyId);
        return company;
    }

    private IntegrationDto.IntegrationResponse toResponse(Integration integration) {
        return IntegrationDto.IntegrationResponse.builder()
                .integrationId(integration.getIntegrationId())
                .integrationType(integration.getIntegrationType())
                .name(integration.getName())
                .displayName(getDisplayName(integration.getIntegrationType()))
                .icon(getIcon(integration.getIntegrationType()))
                .isActive(integration.getIsActive())
                .connectedAt(integration.getCreatedAt())
                .lastSyncAt(integration.getLastSyncAt())
                .lastError(integration.getLastError())
                .connectedByName(
                        integration.getConnectedBy() != null ? integration.getConnectedBy().getUsername() : null)
                .build();
    }

    private String serializeConfig(Map<String, String> config) {
        if (config == null)
            return null;
        try {
            return objectMapper.writeValueAsString(config);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    private Map<String, String> deserializeConfig(String json) {
        if (json == null)
            return new HashMap<>();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {
            });
        } catch (JsonProcessingException e) {
            return new HashMap<>();
        }
    }
}
