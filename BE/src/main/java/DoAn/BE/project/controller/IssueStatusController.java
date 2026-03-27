package DoAn.BE.project.controller;

import DoAn.BE.common.annotation.FeatureFlag;
import DoAn.BE.project.entity.IssueStatus;
import DoAn.BE.project.repository.IssueStatusRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/issue-statuses")
@RequiredArgsConstructor
@Slf4j
@FeatureFlag("PROJECT")
@Transactional(readOnly = true)
public class IssueStatusController {

    private final IssueStatusRepository issueStatusRepository;

    /**
     * Lấy tất cả trạng thái (sắp xếp theo orderIndex)
     */
    @GetMapping
    public ResponseEntity<List<IssueStatus>> getAllStatuses() {
        List<IssueStatus> statuses = issueStatusRepository.findAll(
                org.springframework.data.domain.Sort.by("orderIndex"));
        return ResponseEntity.ok(statuses);
    }

    /**
     * Sắp xếp lại thứ tự cột (batch update orderIndex)
     * Body: [{ "statusId": 1, "orderIndex": 0 }, { "statusId": 2, "orderIndex": 1 }, ...]
     */
    @PutMapping("/reorder")
    @Transactional
    public ResponseEntity<List<IssueStatus>> reorderStatuses(@RequestBody List<Map<String, Integer>> body) {
        for (Map<String, Integer> item : body) {
            Integer statusId = item.get("statusId");
            Integer orderIndex = item.get("orderIndex");
            if (statusId != null && orderIndex != null) {
                issueStatusRepository.findById(statusId).ifPresent(s -> {
                    s.setOrderIndex(orderIndex);
                    issueStatusRepository.save(s);
                });
            }
        }
        List<IssueStatus> updated = issueStatusRepository.findAll(
                org.springframework.data.domain.Sort.by("orderIndex"));
        log.info("Đã sắp xếp lại {} trạng thái", updated.size());
        return ResponseEntity.ok(updated);
    }

    /**
     * Tạo trạng thái mới (cột Kanban mới)
     */
    @PostMapping
    @Transactional
    public ResponseEntity<IssueStatus> createStatus(@RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String color = (String) body.getOrDefault("color", "#6366F1");

        if (name == null || name.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        // Kiểm tra trùng tên
        if (issueStatusRepository.findByName(name.trim()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        // Tìm orderIndex lớn nhất để thêm vào cuối (trước Done)
        List<IssueStatus> allStatuses = issueStatusRepository.findAll(
                org.springframework.data.domain.Sort.by("orderIndex"));

        int newOrderIndex = allStatuses.isEmpty() ? 1 : allStatuses.get(allStatuses.size() - 1).getOrderIndex() + 1;

        // Nếu "Done" tồn tại, chèn trước Done
        for (IssueStatus s : allStatuses) {
            if ("Done".equalsIgnoreCase(s.getName())) {
                newOrderIndex = s.getOrderIndex();
                // Đẩy Done và các status sau lên +1
                for (IssueStatus shift : allStatuses) {
                    if (shift.getOrderIndex() >= newOrderIndex) {
                        shift.setOrderIndex(shift.getOrderIndex() + 1);
                        issueStatusRepository.save(shift);
                    }
                }
                break;
            }
        }

        IssueStatus status = new IssueStatus(name.trim(), newOrderIndex, color);
        status = issueStatusRepository.save(status);

        log.info("Đã tạo trạng thái mới: {} (orderIndex={})", status.getName(), status.getOrderIndex());
        return ResponseEntity.status(HttpStatus.CREATED).body(status);
    }

    /**
     * Cập nhật trạng thái (đổi tên, màu)
     */
    @PutMapping("/{statusId}")
    @Transactional
    public ResponseEntity<IssueStatus> updateStatus(
            @PathVariable Integer statusId,
            @RequestBody Map<String, Object> body) {

        IssueStatus status = issueStatusRepository.findById(statusId).orElse(null);
        if (status == null) return ResponseEntity.notFound().build();

        if (body.containsKey("name")) {
            String newName = ((String) body.get("name")).trim();
            // Kiểm tra trùng tên (trừ chính nó)
            var existing = issueStatusRepository.findByName(newName);
            if (existing.isPresent() && !existing.get().getStatusId().equals(statusId)) {
                return ResponseEntity.status(HttpStatus.CONFLICT).build();
            }
            status.setName(newName);
        }
        if (body.containsKey("color")) {
            status.setColor((String) body.get("color"));
        }
        if (body.containsKey("orderIndex")) {
            status.setOrderIndex((Integer) body.get("orderIndex"));
        }

        status = issueStatusRepository.save(status);
        return ResponseEntity.ok(status);
    }

    /**
     * Xóa trạng thái (chỉ cho phép nếu không có issue nào đang dùng)
     */
    @DeleteMapping("/{statusId}")
    @Transactional
    public ResponseEntity<Void> deleteStatus(@PathVariable Integer statusId) {
        IssueStatus status = issueStatusRepository.findById(statusId).orElse(null);
        if (status == null) return ResponseEntity.notFound().build();

        // Không cho xóa trạng thái mặc định
        if ("To Do".equals(status.getName()) || "Done".equals(status.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // Kiểm tra có issue đang dùng status này không
        if (status.getIssues() != null && !status.getIssues().isEmpty()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        issueStatusRepository.delete(status);
        log.info("Đã xóa trạng thái: {}", status.getName());
        return ResponseEntity.noContent().build();
    }
}
