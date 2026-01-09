package DoAn.BE.company.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import DoAn.BE.company.entity.CompanyMember;
import DoAn.BE.company.entity.CompanyRole;

// Repository quản lý quan hệ User-Company
@Repository
public interface CompanyMemberRepository extends JpaRepository<CompanyMember, Long> {

        // Lấy tất cả memberships của user
        List<CompanyMember> findByUser_UserId(Long userId);

        // Lấy memberships active của user
        List<CompanyMember> findByUser_UserIdAndIsActiveTrue(Long userId);

        // Lấy membership cụ thể (user + company)
        Optional<CompanyMember> findByUser_UserIdAndCompany_CompanyId(Long userId, Long companyId);

        // Lấy membership active cụ thể
        Optional<CompanyMember> findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(Long userId, Long companyId);

        // Lấy tất cả members trong công ty
        List<CompanyMember> findByCompany_CompanyId(Long companyId);

        // Lấy members active trong công ty
        List<CompanyMember> findByCompany_CompanyIdAndIsActiveTrue(Long companyId);

        // [SAAS] Lấy members active trong công ty có phân trang (cho AccountController)
        org.springframework.data.domain.Page<CompanyMember> findByCompany_CompanyIdAndIsActiveTrue(Long companyId,
                        org.springframework.data.domain.Pageable pageable);

        // Kiểm tra user có trong công ty không
        boolean existsByUser_UserIdAndCompany_CompanyId(Long userId, Long companyId);

        // Kiểm tra user có trong công ty và đang active không
        boolean existsByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(Long userId, Long companyId);

        // Lấy members theo role trong công ty
        List<CompanyMember> findByCompany_CompanyIdAndRoleAndIsActiveTrue(Long companyId, CompanyRole role);

        // Đếm members theo role trong công ty
        long countByCompany_CompanyIdAndRoleAndIsActiveTrue(Long companyId, CompanyRole role);

        // Lấy tất cả HR Managers trong công ty
        @Query("SELECT m FROM CompanyMember m WHERE m.company.companyId = :companyId " +
                        "AND m.role = 'MANAGER_HR' AND m.isActive = true")
        List<CompanyMember> findHRManagersByCompany(@Param("companyId") Long companyId);

        // Lấy tất cả Project Managers trong công ty
        @Query("SELECT m FROM CompanyMember m WHERE m.company.companyId = :companyId " +
                        "AND m.role = 'MANAGER_PROJECT' AND m.isActive = true")
        List<CompanyMember> findProjectManagersByCompany(@Param("companyId") Long companyId);

        // Lấy tất cả Admins/Owners trong công ty
        @Query("SELECT m FROM CompanyMember m WHERE m.company.companyId = :companyId " +
                        "AND m.role IN ('OWNER', 'ADMIN') AND m.isActive = true")
        List<CompanyMember> findAdminsByCompany(@Param("companyId") Long companyId);

        // Check by Entity
        boolean existsByUserAndCompany(DoAn.BE.user.entity.User user, DoAn.BE.company.entity.Company company);

        // [SAAS] Đếm tổng số user active trong công ty để check limit gói
        long countByCompany_CompanyIdAndIsActiveTrue(Long companyId);
}
