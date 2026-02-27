package DoAn.BE.sysadmin.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import DoAn.BE.sysadmin.entity.GlobalSettings;
import DoAn.BE.sysadmin.repository.GlobalSettingsRepository;

@ExtendWith(MockitoExtension.class)
public class GlobalSettingsServiceTest {

    @Mock
    private GlobalSettingsRepository globalSettingsRepository;

    @InjectMocks
    private GlobalSettingsService globalSettingsService;

    @Test
    void getAllSettings_Success() {
        GlobalSettings setting1 = new GlobalSettings("key1", "val1", "desc");
        GlobalSettings setting2 = new GlobalSettings("key2", "val2", "desc");

        when(globalSettingsRepository.findAll()).thenReturn(List.of(setting1, setting2));

        Map<String, String> result = globalSettingsService.getAllSettings();

        assertNotNull(result);
        assertEquals(2, result.size());
        assertEquals("val1", result.get("key1"));
        assertEquals("val2", result.get("key2"));
    }

    @Test
    void updateSettings_Success() {
        Map<String, String> newSettings = new HashMap<>();
        newSettings.put("key1", "newVal1");

        GlobalSettings existingSetting = new GlobalSettings("key1", "oldVal", "desc");
        when(globalSettingsRepository.findBySettingKey("key1")).thenReturn(Optional.of(existingSetting));

        globalSettingsService.updateSettings(newSettings);

        assertEquals("newVal1", existingSetting.getSettingValue());
        verify(globalSettingsRepository).save(existingSetting);
    }

    @Test
    void initDefaults_Success() {
        when(globalSettingsRepository.count()).thenReturn(0L);

        globalSettingsService.initDefaults();

        verify(globalSettingsRepository, times(3)).save(any(GlobalSettings.class));
    }
}
