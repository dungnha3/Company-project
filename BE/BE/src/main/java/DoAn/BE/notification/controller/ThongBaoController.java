package DoAn.BE.notification.controller;

import DoAn.BE.common.util.PermissionUtil;
import DoAn.BE.notification.dto.CreateThongBaoRequest;
import DoAn.BE.notification.dto.ThongBaoDTO;
import DoAn.BE.notification.entity.ThongBao.LoaiThongBao;
import DoAn.BE.notification.service.ThongBaoService;
import DoAn.BE.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/thong-bao")
@RequiredArgsConstructor
public class ThongBaoController {

    private final ThongBaoService thongBaoService;

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (User) auth.getPrincipal();
    }

    // Tạo thông báo mới - Chỉ HR Manager và Admin
    @PostMapping
    public ResponseEntity<ThongBaoDTO> createThongBao(@Valid @RequestBody CreateThongBaoRequest request) {
        User currentUser = getCurrentUser();
        // Chỉ HR Manager và Admin mới có quyền tạo thông báo
        if (!currentUser.isManagerHR() && !currentUser.isAdmin()) {
            throw new RuntimeException("Chỉ HR Manager và Admin mới có quyền tạo thông báo");
        }

        ThongBaoDTO thongBao = thongBaoService.createThongBao(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(thongBao);
    }

    // [ADMIN ONLY] Lấy TẤT CẢ thông báo trong hệ thống
    @GetMapping("/admin/all")
    public ResponseEntity<Page<ThongBaoDTO>> getAllNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "ngayTao") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        User currentUser = getCurrentUser();
        // Chỉ Admin mới có quyền xem tất cả thông báo
        if (!currentUser.isAdmin()) {
            throw new RuntimeException("Chỉ Admin mới có quyền xem tất cả thông báo");
        }

        Sort sort = sortDir.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<ThongBaoDTO> notifications = thongBaoService.getAllNotifications(pageable);
        return ResponseEntity.ok(notifications);
    }

    // Lấy danh sách thông báo của user hiện tại
    @GetMapping
    public ResponseEntity<List<ThongBaoDTO>> getMyNotifications() {
        User currentUser = getCurrentUser();
        List<ThongBaoDTO> notifications = thongBaoService.getUserNotifications(currentUser.getUserId());
        return ResponseEntity.ok(notifications);
    }

    // Lấy danh sách thông báo với phân trang
    @GetMapping("/page")
    public ResponseEntity<Page<ThongBaoDTO>> getMyNotificationsPage(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "ngayTao") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        User currentUser = getCurrentUser();
        Sort sort = sortDir.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<ThongBaoDTO> notifications = thongBaoService.getUserNotifications(currentUser.getUserId(), pageable);
        return ResponseEntity.ok(notifications);
    }

    // Đếm số thông báo chưa đọc
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        User currentUser = getCurrentUser();
        long count = thongBaoService.getUnreadCount(currentUser.getUserId());

        Map<String, Long> response = new HashMap<>();
        response.put("unreadCount", count);
        return ResponseEntity.ok(response);
    }

    // Đánh dấu thông báo đã đọc
    @PutMapping("/{id}/read")
    public ResponseEntity<Map<String, String>> markAsRead(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        thongBaoService.markAsRead(id, currentUser.getUserId());

        Map<String, String> response = new HashMap<>();
        response.put("message", "Đã đánh dấu thông báo đã đọc");
        return ResponseEntity.ok(response);
    }

    // Đánh dấu tất cả thông báo đã đọc
    @PutMapping("/mark-all-read")
    public ResponseEntity<Map<String, String>> markAllAsRead() {
        User currentUser = getCurrentUser();
        thongBaoService.markAllAsRead(currentUser.getUserId());

        Map<String, String> response = new HashMap<>();
        response.put("message", "Đã đánh dấu tất cả thông báo đã đọc");
        return ResponseEntity.ok(response);
    }

    // Xóa thông báo
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteNotification(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        thongBaoService.deleteNotification(id, currentUser.getUserId());

        Map<String, String> response = new HashMap<>();
        response.put("message", "Đã xóa thông báo");
        return ResponseEntity.ok(response);
    }

    // Lấy thông báo theo loại
    @GetMapping("/type/{loai}")
    public ResponseEntity<List<ThongBaoDTO>> getNotificationsByType(@PathVariable LoaiThongBao loai) {
        User currentUser = getCurrentUser();
        List<ThongBaoDTO> notifications = thongBaoService.getNotificationsByType(currentUser.getUserId(), loai);
        return ResponseEntity.ok(notifications);
    }

    // Lấy thông báo ưu tiên cao
    @GetMapping("/high-priority")
    public ResponseEntity<List<ThongBaoDTO>> getHighPriorityNotifications() {
        User currentUser = getCurrentUser();
        List<ThongBaoDTO> notifications = thongBaoService.getHighPriorityNotifications(currentUser.getUserId());
        return ResponseEntity.ok(notifications);
    }

    // Thống kê thông báo theo loại
    @GetMapping("/stats")
    public ResponseEntity<Map<LoaiThongBao, Long>> getNotificationStats() {
        User currentUser = getCurrentUser();
        Map<LoaiThongBao, Long> stats = thongBaoService.getNotificationStats(currentUser.getUserId());
        return ResponseEntity.ok(stats);
    }
}
