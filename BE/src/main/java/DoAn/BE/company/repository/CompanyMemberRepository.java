package DoAn.BE.company.repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.data.jpa.repository.JpaRepository;
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

        // Lấy pending invites (memberships chưa kích hoạt) của user
        List<CompanyMember> findByUser_UserIdAndIsActiveFalse(Long userId);

        // Lấy membership cụ thể (user + company)
        Optional<CompanyMember> findByUser_UserIdAndCompany_CompanyId(Long userId, Long companyId);

        // Lấy membership active cụ thể
        Optional<CompanyMember> findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(Long userId, Long companyId);

        // Lấy tất cả members trong công ty
        List<CompanyMember> findByCompany_CompanyId(Long companyId);

        // Eagerly fetch user and roles to avoid LazyInitializationException
        @org.springframework.data.jpa.repository.Query("SELECT DISTINCT cm FROM CompanyMember cm " +
                        "JOIN FETCH cm.user " +
                        "LEFT JOIN FETCH cm.roles " +
                        "WHERE cm.company.companyId = :companyId")
        List<CompanyMember> findByCompanyIdWithUserAndRoles(
                        @org.springframework.data.repository.query.Param("companyId") Long companyId);

        // Lấy members active trong công ty
        List<CompanyMember> findByCompany_CompanyIdAndIsActiveTrue(Long companyId);

        // [SAAS] Lấy members active trong công ty có phân trang (cho AccountController)
        org.springframework.data.domain.Page<CompanyMember> findByCompany_CompanyIdAndIsActiveTrue(Long companyId,
                        org.springframework.data.domain.Pageable pageable);

        // Kiểm tra user có trong công ty không
        boolean existsByUser_UserIdAndCompany_CompanyId(Long userId, Long companyId);

        // Kiểm tra user có trong công ty và đang active không
        boolean existsByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(Long userId, Long companyId);

        // Check by Entity
        boolean existsByUserAndCompany(DoAn.BE.user.entity.User user, DoAn.BE.company.entity.Company company);

        // [SAAS] Đếm tổng số user active trong công ty để check limit gói
        long countByCompany_CompanyIdAndIsActiveTrue(Long companyId);

        // ==========================================
        // MULTI-ROLE SUPPORT (Derived Queries)
        // ==========================================

        // Tìm members có chứa role cụ thể
        List<CompanyMember> findByCompany_CompanyIdAndRolesContainingAndIsActiveTrue(Long companyId, CompanyRole role);

        // Đếm members có chứa role cụ thể
        long countByCompany_CompanyIdAndRolesContainingAndIsActiveTrue(Long companyId, CompanyRole role);

        // Tìm members có chứa 1 trong các role (OR logic)
        List<CompanyMember> findByCompany_CompanyIdAndRolesInAndIsActiveTrue(Long companyId, Set<CompanyRole> roles);

        // ==========================================
        // DEFAULT METHODS
        // ==========================================

        // Lấy tất cả HR Managers trong công ty
        default List<CompanyMember> findHRManagersByCompany(Long companyId) {
                return findByCompany_CompanyIdAndRolesContainingAndIsActiveTrue(companyId, CompanyRole.MANAGER_HR);
        }

        // Lấy tất cả Project Managers trong công ty
        default List<CompanyMember> findProjectManagersByCompany(Long companyId) {
                return findByCompany_CompanyIdAndRolesContainingAndIsActiveTrue(companyId, CompanyRole.MANAGER_PROJECT);
        }

        // Lấy tất cả Admins/Owners trong công ty
        default List<CompanyMember> findAdminsByCompany(Long companyId) {
                return findByCompany_CompanyIdAndRolesInAndIsActiveTrue(companyId,
                                Set.of(CompanyRole.OWNER, CompanyRole.ADMIN));
        }
}
