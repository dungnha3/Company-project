package DoAn.BE.sysadmin.service;

import DoAn.BE.sysadmin.entity.GlobalSettings;
import DoAn.BE.sysadmin.repository.GlobalSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GlobalSettingsService {

    private final GlobalSettingsRepository globalSettingsRepository;

    @Transactional(readOnly = true)
    public Map<String, String> getAllSettings() {
        return globalSettingsRepository.findAll().stream()
                .collect(Collectors.toMap(GlobalSettings::getSettingKey,
                        setting -> setting.getSettingValue() != null ? setting.getSettingValue() : ""));
    }

    @Transactional
    public void updateSettings(Map<String, String> newSettings) {
        newSettings.forEach((key, value) -> {
            GlobalSettings setting = globalSettingsRepository.findBySettingKey(key)
                    .orElse(new GlobalSettings(key, value, null));
            setting.setSettingValue(value);
            globalSettingsRepository.save(setting);
        });
    }

    @Transactional
    public void initDefaults() {
        if (globalSettingsRepository.count() == 0) {
            globalSettingsRepository
                    .save(new GlobalSettings("maintenance_mode", "false", "System is under maintenance"));
            globalSettingsRepository
                    .save(new GlobalSettings("allow_registration", "true", "Allow new user registration"));
            globalSettingsRepository
                    .save(new GlobalSettings("default_trial_days", "14", "Default trial period duration"));
        }
    }
}
