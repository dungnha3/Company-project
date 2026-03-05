package DoAn.BE.sysadmin.controller;

import DoAn.BE.sysadmin.service.GlobalSettingsService;
import DoAn.BE.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@RestController
@RequestMapping("/api/sysadmin/settings")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SysAdminSettingsController {

    private final GlobalSettingsService globalSettingsService;

    @GetMapping
    public ResponseEntity<?> getGlobalSettings(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        if (!user.isSystemAdminAccount()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(globalSettingsService.getAllSettings());
    }

    @PutMapping
    public ResponseEntity<?> updateGlobalSettings(@RequestBody Map<String, String> newSettings,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        if (!user.isSystemAdminAccount()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        globalSettingsService.updateSettings(newSettings);
        return ResponseEntity.ok(Map.of("message", "Global settings updated successfully"));
    }
}
