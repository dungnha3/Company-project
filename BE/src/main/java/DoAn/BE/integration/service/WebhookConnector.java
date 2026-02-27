package DoAn.BE.integration.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

// Service for sending webhook notifications (Slack, Discord, etc.)
// /
@Service
@Slf4j
public class WebhookConnector {

    private final RestTemplate restTemplate;

    public WebhookConnector(org.springframework.boot.web.client.RestTemplateBuilder builder) {
        this.restTemplate = builder
                .connectTimeout(java.time.Duration.ofSeconds(5))
                .readTimeout(java.time.Duration.ofSeconds(10))
                .build();
    }

    public boolean sendSlackNotification(String webhookUrl, String message, String title) {
        try {
            Map<String, Object> payload = new HashMap<>();

            // Format for Slack Block Kit or simple text
            if (title != null) {
                payload.put("text", "*" + title + "*\n" + message);
            } else {
                payload.put("text", message);
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
            restTemplate.postForEntity(webhookUrl, request, String.class);
            return true;
        } catch (Exception e) {
            log.error("Failed to send Slack notification: {}", e.getMessage());
            return false;
        }
    }

    public boolean sendDiscordNotification(String webhookUrl, String message, String title) {
        try {
            Map<String, Object> payload = new HashMap<>();

            // Discord format
            if (title != null) {
                payload.put("content", "**" + title + "**\n" + message);
            } else {
                payload.put("content", message);
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
            // Discord requires User-Agent
            headers.add("User-Agent", "CompanyProject-Bot");

            restTemplate.postForEntity(webhookUrl, request, String.class);
            return true;
        } catch (Exception e) {
            log.error("Failed to send Discord notification: {}", e.getMessage());
            return false;
        }
    }

    public boolean sendGenericWebhook(String webhookUrl, Map<String, Object> data) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(data, headers);
            restTemplate.postForEntity(webhookUrl, request, String.class);
            return true;
        } catch (Exception e) {
            log.error("Failed to send Generic webhook: {}", e.getMessage());
            return false;
        }
    }
}
