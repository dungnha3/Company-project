package DoAn.BE.hrm.controller;

import DoAn.BE.hrm.dto.CreateOnboardingTemplateRequest;
import DoAn.BE.hrm.dto.StartOnboardingRequest;
import DoAn.BE.hrm.dto.UpdateOnboardingProgressRequest;
import DoAn.BE.hrm.entity.OnboardingTemplate;
import DoAn.BE.hrm.entity.OnboardingInstance;
import DoAn.BE.hrm.service.OnboardingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import DoAn.BE.common.service.AccessControlService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import DoAn.BE.common.annotation.FeatureFlag;

@RestController
@RequestMapping("/api/onboarding")
@FeatureFlag("ONBOARDING")
@RequiredArgsConstructor
public class OnboardingController {

    private final OnboardingService onboardingService;
    private final AccessControlService accessControlService;

    @GetMapping("/templates")
    public ResponseEntity<List<OnboardingTemplate>> getTemplates() {
        return ResponseEntity.ok(onboardingService.getAllTemplates());
    }

    @PostMapping("/templates")
    public ResponseEntity<OnboardingTemplate> createTemplate(
            @Valid @RequestBody CreateOnboardingTemplateRequest request) {
        accessControlService.checkHrEditPermission();
        return ResponseEntity.status(HttpStatus.CREATED).body(onboardingService.createTemplate(request));
    }

    @GetMapping("/instances")
    public ResponseEntity<List<OnboardingInstance>> getInstances() {
        return ResponseEntity.ok(onboardingService.getAllInstances());
    }

    @PostMapping("/instances")
    public ResponseEntity<OnboardingInstance> startOnboarding(
            @Valid @RequestBody StartOnboardingRequest request) {
        accessControlService.checkHrEditPermission();
        return ResponseEntity.status(HttpStatus.CREATED).body(onboardingService.startOnboarding(request));
    }

    @PutMapping("/instances/{id}/progress")
    public ResponseEntity<OnboardingInstance> updateProgress(
            @PathVariable Long id,
            @Valid @RequestBody UpdateOnboardingProgressRequest request) {
        accessControlService.checkHrEditPermission();
        return ResponseEntity.ok(onboardingService.updateProgress(id, request));
    }
}
