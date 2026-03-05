package DoAn.BE.hrm.controller;

import DoAn.BE.hrm.dto.CreateOKRRequest;
import DoAn.BE.hrm.dto.UpdateOKRRequest;
import DoAn.BE.hrm.entity.OKR;
import DoAn.BE.hrm.service.OKRService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import DoAn.BE.common.service.AccessControlService;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import DoAn.BE.common.annotation.FeatureFlag;

@RestController
@RequestMapping("/api/okrs")
@FeatureFlag("OKR")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OKRController {

    private final OKRService okrService;
    private final AccessControlService accessControlService;

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
    public ResponseEntity<OKR> create(@Valid @RequestBody CreateOKRRequest request) {
        accessControlService.checkOkrManagePermission();
        OKR okr = okrService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(okr);
    }

    @PutMapping("/{id}")
    public ResponseEntity<OKR> update(@PathVariable Long id, @Valid @RequestBody UpdateOKRRequest request) {
        accessControlService.checkOkrManagePermission();
        return ResponseEntity.ok(okrService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        accessControlService.checkCompanyAdminPermission();
        okrService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
