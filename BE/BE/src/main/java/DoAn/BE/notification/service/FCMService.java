package DoAn.BE.notification.service;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Map;

// [Service gửi Push Notification qua Firebase Cloud Messaging] (Role: System)
// [ASYNC: All methods run in background thread pool to avoid blocking]
@Service
@Slf4j
public class FCMService {

    // [Gửi notification đến thiết bị cụ thể - ASYNC] (Role: Internal)
    @Async("notificationExecutor")
    public void sendToDevice(String fcmToken, String title, String body, Map<String, String> data) {
        // [Validate input] (Role: Guard)
        if (fcmToken == null || fcmToken.isBlank()) {
            log.warn("FCM token trống, bỏ qua gửi notification");
            return;
        }

        try {
            // [Xây dựng notification] (Role: Build)
            Notification notification = Notification.builder()
                    .setTitle(title)
                    .setBody(body)
                    .build();

            Message.Builder messageBuilder = Message.builder()
                    .setToken(fcmToken)
                    .setNotification(notification);

            // [Thêm data payload nếu có] (Role: Optional)
            if (data != null && !data.isEmpty()) {
                messageBuilder.putAllData(data);
            }

            // [Gửi message] (Role: Send)
            String response = FirebaseMessaging.getInstance().send(messageBuilder.build());
            log.info("✅ Gửi FCM thành công: {}", response);
        } catch (Exception e) {
            log.error("❌ Lỗi gửi FCM message: {}", e.getMessage());
        }
    }

    // [Gửi notification đến topic - ASYNC] (Role: Internal)
    @Async("notificationExecutor")
    public void sendToTopic(String topic, String title, String body, Map<String, String> data) {
        // [Validate input] (Role: Guard)
        if (topic == null || topic.isBlank()) {
            log.warn("Topic trống, bỏ qua gửi notification");
            return;
        }

        try {
            // [Xây dựng notification] (Role: Build)
            Notification notification = Notification.builder()
                    .setTitle(title)
                    .setBody(body)
                    .build();

            Message.Builder messageBuilder = Message.builder()
                    .setTopic(topic)
                    .setNotification(notification);

            // [Thêm data payload nếu có] (Role: Optional)
            if (data != null && !data.isEmpty()) {
                messageBuilder.putAllData(data);
            }

            // [Gửi message] (Role: Send)
            String response = FirebaseMessaging.getInstance().send(messageBuilder.build());
            log.info("✅ Gửi FCM đến topic {} thành công: {}", topic, response);
        } catch (Exception e) {
            log.error("❌ Lỗi gửi FCM message đến topic: {}", e.getMessage());
        }
    }
}
