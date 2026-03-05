package DoAn.BE.company.repository;

import DoAn.BE.company.entity.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

// Repository cho Company entity
@Repository
public interface CompanyRepository extends JpaRepository<Company, Long> {

    Optional<Company> findBySlug(String slug);

    boolean existsBySlug(String slug);

    Optional<Company> findByName(String name);

    // [SAAS] Kiểm tra công ty có đang hoạt động không
    boolean existsByCompanyIdAndIsActiveTrue(Long companyId);

    // [OPTIMIZED] Count active companies without loading all entities
    long countByIsActiveTrue();
}
