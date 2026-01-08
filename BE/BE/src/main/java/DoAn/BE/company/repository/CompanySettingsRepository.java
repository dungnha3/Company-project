package DoAn.BE.company.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import DoAn.BE.company.entity.CompanySettings;

@Repository
public interface CompanySettingsRepository extends JpaRepository<CompanySettings, Long> {
}
