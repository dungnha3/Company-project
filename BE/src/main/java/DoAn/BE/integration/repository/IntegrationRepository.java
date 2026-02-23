package DoAn.BE.integration.repository;

import DoAn.BE.integration.entity.Integration;
import DoAn.BE.integration.entity.Integration.IntegrationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IntegrationRepository extends JpaRepository<Integration, Long> {

    List<Integration> findByCompany_CompanyId(Long companyId);

    List<Integration> findByCompany_CompanyIdAndIsActiveTrue(Long companyId);

    Optional<Integration> findByCompany_CompanyIdAndIntegrationType(Long companyId, IntegrationType type);

    Optional<Integration> findByIntegrationIdAndCompany_CompanyId(Long integrationId, Long companyId);

    boolean existsByCompany_CompanyIdAndIntegrationType(Long companyId, IntegrationType type);

    long countByCompany_CompanyId(Long companyId);
}
