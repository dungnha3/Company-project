package DoAn.BE.hrm.controller;

import DoAn.BE.hrm.entity.OnboardingTemplate;
import DoAn.BE.hrm.entity.OnboardingInstance;
import DoAn.BE.hrm.service.OnboardingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/onboarding")
@RequiredArgsConstructor
public class OnboardingController {

    private final OnboardingService onboardingService;

    @GetMapping("/templates")
    public ResponseEntity<List<OnboardingTemplate>> getTemplates() {
        return ResponseEntity.ok(onboardingService.getAllTemplates());
    }

    @PostMapping("/templates")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'MANAGER_HR')")
    public ResponseEntity<OnboardingTemplate> createTemplate(@RequestBody Map<String, Object> request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(onboardingService.createTemplate(request));
    }

    @GetMapping("/instances")
    public ResponseEntity<List<OnboardingInstance>> getInstances() {
        return ResponseEntity.ok(onboardingService.getAllInstances());
    }

    @PostMapping("/instances")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'MANAGER_HR')")
    public ResponseEntity<OnboardingInstance> startOnboarding(@RequestBody Map<String, Object> request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(onboardingService.startOnboarding(request));
    }

    @PutMapping("/instances/{id}/progress")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN', 'MANAGER_HR')")
    public ResponseEntity<OnboardingInstance> updateProgress(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request) {
        return ResponseEntity.ok(onboardingService.updateProgress(id, request));
    }
}
