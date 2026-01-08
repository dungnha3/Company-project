package DoAn.BE.company.controller;

import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.company.entity.CompanyRole;
import DoAn.BE.common.service.FirebaseSyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

// [Controller đồng bộ Firebase] (Role: Admin)
@RestController
@RequestMapping("/api/admin/sync")
@RequiredArgsConstructor
public class SyncController {

    private final FirebaseSyncService syncService;
    private final AccessControlService accessControlService;

    // [Yêu cầu đồng bộ Firebase thủ công] (Role: Company Admin)
    @PostMapping("/firebase")
    public ResponseEntity<?> forceSyncFirebase(
            @RequestParam Long companyId,
            @RequestParam(required = false) String module) {

        // [Kiểm tra quyền Admin] (Role: Admin only)
        accessControlService.checkPermission(companyId, CompanyRole.ADMIN);

        // [Thực hiện đồng bộ theo module] (Role: System)
        if ("chat".equals(module)) {
            syncService.syncAllMessages(companyId);
        } else if ("notifications".equals(module)) {
            syncService.syncAllNotifications(companyId);
        } else {
            syncService.syncAll(companyId);
        }

        return ResponseEntity.ok(Map.of(
                "status", "Đã khởi tạo yêu cầu đồng bộ thành công",
                "companyId", companyId,
                "module", module != null ? module : "all",
                "firebaseConnected", syncService.isFirebaseConnected()));
    }
}
