package DoAn.BE.company.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
// Sẽ tích hợp đầy đủ khi Firebase SDK được cấu hình trong Phase 4
@Service("stubFirebaseSyncService")
@Slf4j
public class FirebaseSyncService {
    public void syncAllMessages(Long companyId) {
        log.info("📨 [STUB] Đồng bộ tin nhắn cho company ID: {}", companyId);
        // Stub: Sẽ implement khi Firebase Realtime Database được tích hợp
    }
    public void syncAllNotifications(Long companyId) {
        log.info("🔔 [STUB] Đồng bộ thông báo cho company ID: {}", companyId);
        // Stub: Sẽ implement khi Firebase Cloud Messaging được tích hợp
    }
    public void syncAll(Long companyId) {
        log.info("🔄 [STUB] Đồng bộ toàn bộ dữ liệu cho company ID: {}", companyId);
        syncAllMessages(companyId);
        syncAllNotifications(companyId);
    }
    public boolean isFirebaseConnected() {
        log.debug("🔌 [STUB] Kiểm tra kết nối Firebase - trả về true cho MVP");
        return true;
    }
}
