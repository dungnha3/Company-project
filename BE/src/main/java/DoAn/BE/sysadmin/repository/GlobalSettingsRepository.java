package DoAn.BE.sysadmin.repository;

import DoAn.BE.sysadmin.entity.GlobalSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GlobalSettingsRepository extends JpaRepository<GlobalSettings, String> {
    Optional<GlobalSettings> findBySettingKey(String settingKey);
}
