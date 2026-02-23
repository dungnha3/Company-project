package DoAn.BE.company.repository;

import DoAn.BE.company.entity.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

// Repository cho Company entity
@Repository
public interface CompanyRepository extends JpaRepository<Company, Long> {

    // Tìm company theo slug
    Optional<Company> findBySlug(String slug);

    // Kiểm tra slug đã tồn tại chưa
    boolean existsBySlug(String slug);

    // Tìm company theo tên
    Optional<Company> findByName(String name);

    // [SAAS] Kiểm tra công ty có đang hoạt động không
    boolean existsByCompanyIdAndIsActiveTrue(Long companyId);

    // [OPTIMIZED] Count active companies without loading all entities
    long countByIsActiveTrue();
}
