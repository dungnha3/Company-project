package DoAn.BE.auth.repository;

import DoAn.BE.auth.entity.SsoProvider;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SsoProviderRepository extends JpaRepository<SsoProvider, Long> {

    List<SsoProvider> findByCompany_CompanyIdAndIsActiveTrue(Long companyId);

    Optional<SsoProvider> findByCompany_CompanyIdAndIsDefaultTrue(Long companyId);

    Optional<SsoProvider> findByProviderIdAndCompany_CompanyId(Long providerId, Long companyId);

    boolean existsByCompany_CompanyIdAndName(Long companyId, String name);

    long countByCompany_CompanyId(Long companyId);
}
