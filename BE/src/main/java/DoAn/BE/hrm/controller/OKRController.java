package DoAn.BE.hrm.controller;

import DoAn.BE.hrm.entity.OKR;
import DoAn.BE.hrm.service.OKRService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/okrs")
@RequiredArgsConstructor
public class OKRController {

    private final OKRService okrService;

    @GetMapping
    public ResponseEntity<List<OKR>> getAll(@RequestParam(required = false) String period) {
        return ResponseEntity.ok(okrService.findAll(period));
    }

    @GetMapping("/my")
    public ResponseEntity<List<OKR>> getMyOKRs() {
        return ResponseEntity.ok(okrService.findByCurrentUser());
    }

    @GetMapping("/department/{deptId}")
    public ResponseEntity<List<OKR>> getByDepartment(@PathVariable Long deptId) {
        return ResponseEntity.ok(okrService.findByDepartment(deptId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<OKR> getById(@PathVariable Long id) {
        return ResponseEntity.ok(okrService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'MANAGER_HR')")
    public ResponseEntity<OKR> create(@RequestBody Map<String, Object> request) {
        OKR okr = okrService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(okr);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'MANAGER_HR')")
    public ResponseEntity<OKR> update(@PathVariable Long id, @RequestBody Map<String, Object> request) {
        return ResponseEntity.ok(okrService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        okrService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
