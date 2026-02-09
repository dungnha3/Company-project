package DoAn.BE.common.service;

import DoAn.BE.chat.entity.Message;
import DoAn.BE.common.event.MessageCreatedEvent;
import DoAn.BE.common.event.NotificationCreatedEvent;
import DoAn.BE.common.event.NotificationReadEvent;
import DoAn.BE.notification.entity.Notification;
import DoAn.BE.common.context.TenantContext;
import DoAn.BE.company.entity.CompanySettings;
import DoAn.BE.company.service.CompanyService;
import com.google.cloud.firestore.FieldValue;
import com.google.cloud.firestore.Firestore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.ObjectProvider;

@Service
@Slf4j
@RequiredArgsConstructor
@SuppressWarnings("null")
public class FirebaseSyncService {

    private final ObjectProvider<Firestore> firestoreProvider;
    private final CompanyService companyService;

    @Async
    @EventListener
    public void handleMessageCreated(MessageCreatedEvent event) {
        if (firestoreProvider.getIfAvailable() == null)
            return;

        Firestore firestore = firestoreProvider.getIfAvailable();

        Message msg = event.getMessage();
        Long companyId = msg.getChatRoom().getCompany().getCompanyId();

        CompanySettings settings = companyService.getSettingsCached(companyId);
        if (!settings.isChatModuleEnabled()) {
            log.debug("Chat disabled for company {}, skipping Firebase sync", companyId);
            return;
        }

        Long roomId = msg.getChatRoom().getRoomId();

        Map<String, Object> data = Map.of(
                "senderId", msg.getSender().getUserId(),
                "senderName", msg.getSender().getFullName(),
                "avatar", msg.getSender().getAvatarUrl() != null ? msg.getSender().getAvatarUrl() : "",
                "content", msg.getContent(),
                "type", msg.getMessageType().name(),
                "fileUrl", msg.getFile() != null ? msg.getFile().getUrl() : "",
                "createdAt", FieldValue.serverTimestamp(),
                "readBy", List.of(msg.getSender().getUserId()));

        try {
            firestore.collection("companies")
                    .document(companyId.toString())
                    .collection("conversations")
                    .document(roomId.toString())
                    .collection("messages")
                    .document(msg.getMessageId().toString())
                    .set(data);

            Map<String, Object> roomUpdate = Map.of("lastMessage", data);
            firestore.collection("companies")
                    .document(companyId.toString())
                    .collection("conversations")
                    .document(roomId.toString())
                    .set(roomUpdate, com.google.cloud.firestore.SetOptions.merge());

            log.debug("Synced message {} to Firestore", msg.getMessageId());
        } catch (Exception e) {
            log.error("Failed to sync message {} to Firestore: {}", msg.getMessageId(), e.getMessage());
        }
    }

    @Async
    @EventListener
    public void handleNotificationCreated(NotificationCreatedEvent event) {
        if (firestoreProvider.getIfAvailable() == null)
            return;

        Notification notif = event.getNotification();
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null) {
            log.warn("Cannot sync notification {}: Missing TenantContext", notif.getNotificationId());
            return;
        }

        Long userId = notif.getUser().getUserId();

        Map<String, Object> data = Map.of(
                "title", notif.getTitle(),
                "body", notif.getContent() != null ? notif.getContent() : "",
                "type", notif.getType(),
                "data", Map.of("link", notif.getLink() != null ? notif.getLink() : ""),
                "isRead", false,
                "createdAt", FieldValue.serverTimestamp());

        syncNotificationToFirestore(companyId, userId, notif.getNotificationId().toString(), data);
    }

    private void syncNotificationToFirestore(Long companyId, Long userId, String notifId, Map<String, Object> data) {
        Firestore firestore = firestoreProvider.getIfAvailable();
        if (firestore == null)
            return;
        try {
            firestore.collection("companies")
                    .document(companyId.toString())
                    .collection("notifications")
                    .document(userId.toString())
                    .collection("items")
                    .document(notifId)
                    .set(data);
        } catch (Exception e) {
            log.error("Failed to sync notification {} to Firestore: {}", notifId, e.getMessage());
        }
    }

    @Async
    @EventListener
    public void handleNotificationRead(NotificationReadEvent event) {
        Firestore firestore = firestoreProvider.getIfAvailable();
        if (firestore == null)
            return;
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null)
            return;

        try {
            firestore.collection("companies")
                    .document(companyId.toString())
                    .collection("notifications")
                    .document(event.getUserId().toString())
                    .collection("items")
                    .document(event.getNotificationId().toString())
                    .update("isRead", true);
        } catch (Exception e) {
            log.error("Failed to update notification read status {}: {}", event.getNotificationId(), e.getMessage());
        }
    }

    public void syncAllMessages(Long companyId) {
        // Implementation for syncing all messages for a specific company
        log.info("Starting sync of all messages for company {}...", companyId);
        // This would typically iterate over all messages in DB for this company and
        // push to Firestore
    }

    public void syncAllNotifications(Long companyId) {
        // Implementation for syncing all notifications for a specific company
        log.info("Starting sync of all notifications for company {}...", companyId);
    }

    public void syncAll(Long companyId) {
        syncAllMessages(companyId);
        syncAllNotifications(companyId);
    }

    public boolean isFirebaseConnected() {
        return firestoreProvider.getIfAvailable() != null;
    }
}
