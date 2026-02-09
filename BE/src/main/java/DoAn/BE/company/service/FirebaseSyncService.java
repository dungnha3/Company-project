package DoAn.BE.company.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

// [Stub Service - Đồng bộ Firebase] (Role: Admin/System)
// Sẽ tích hợp đầy đủ khi Firebase SDK được cấu hình trong Phase 4
@Service("stubFirebaseSyncService")
@Slf4j
public class FirebaseSyncService {

    // [Đồng bộ tất cả tin nhắn] (Role: Admin)
    public void syncAllMessages(Long companyId) {
        log.info("📨 [STUB] Đồng bộ tin nhắn cho company ID: {}", companyId);
        // Stub: Sẽ implement khi Firebase Realtime Database được tích hợp
    }

    // [Đồng bộ tất cả thông báo] (Role: Admin)
    public void syncAllNotifications(Long companyId) {
        log.info("🔔 [STUB] Đồng bộ thông báo cho company ID: {}", companyId);
        // Stub: Sẽ implement khi Firebase Cloud Messaging được tích hợp
    }

    // [Đồng bộ toàn bộ dữ liệu] (Role: Admin)
    public void syncAll(Long companyId) {
        log.info("🔄 [STUB] Đồng bộ toàn bộ dữ liệu cho company ID: {}", companyId);
        syncAllMessages(companyId);
        syncAllNotifications(companyId);
    }

    // [Kiểm tra trạng thái kết nối Firebase] (Role: System)
    public boolean isFirebaseConnected() {
        log.debug("🔌 [STUB] Kiểm tra kết nối Firebase - trả về true cho MVP");
        return true;
    }
}
