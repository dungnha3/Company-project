package DoAn.BE.company.repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import DoAn.BE.company.entity.CompanyMember;
import DoAn.BE.company.entity.CompanyRole;

@Repository
public interface CompanyMemberRepository extends JpaRepository<CompanyMember, Long> {

    List<CompanyMember> findByUser_UserId(Long userId);

    List<CompanyMember> findByUser_UserIdAndIsActiveTrue(Long userId);

    List<CompanyMember> findByUser_UserIdAndIsActiveFalse(Long userId);

    Optional<CompanyMember> findByUser_UserIdAndCompany_CompanyId(Long userId, Long companyId);

    Optional<CompanyMember> findByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(Long userId, Long companyId);

    @Query("SELECT DISTINCT cm FROM CompanyMember cm " +
            "LEFT JOIN FETCH cm.roles " +
            "WHERE cm.user.userId = :userId AND cm.company.companyId = :companyId AND cm.isActive = true")
    Optional<CompanyMember> findActiveMemberWithRoles(@Param("userId") Long userId, @Param("companyId") Long companyId);

    @Query("SELECT DISTINCT cm FROM CompanyMember cm " +
            "JOIN FETCH cm.user " +
            "LEFT JOIN FETCH cm.roles " +
            "WHERE cm.company.companyId = :companyId")
    List<CompanyMember> findByCompanyIdWithUserAndRoles(@Param("companyId") Long companyId);

    @Query("SELECT DISTINCT cm FROM CompanyMember cm " +
            "JOIN FETCH cm.user " +
            "LEFT JOIN FETCH cm.roles " +
            "WHERE cm.company.companyId = :companyId AND cm.isActive = true")
    List<CompanyMember> findByCompanyIdWithUserAndRolesActive(@Param("companyId") Long companyId);

    List<CompanyMember> findByCompany_CompanyId(Long companyId);

    List<CompanyMember> findByCompany_CompanyIdAndIsActiveTrue(Long companyId);

    Page<CompanyMember> findByCompany_CompanyIdAndIsActiveTrue(Long companyId, Pageable pageable);

    boolean existsByUser_UserIdAndCompany_CompanyId(Long userId, Long companyId);

    boolean existsByUser_UserIdAndCompany_CompanyIdAndIsActiveTrue(Long userId, Long companyId);

    boolean existsByUserAndCompany(DoAn.BE.user.entity.User user, DoAn.BE.company.entity.Company company);

    long countByCompany_CompanyIdAndIsActiveTrue(Long companyId);

    List<CompanyMember> findByCompany_CompanyIdAndRolesContainingAndIsActiveTrue(Long companyId, CompanyRole role);

    long countByCompany_CompanyIdAndRolesContainingAndIsActiveTrue(Long companyId, CompanyRole role);

    List<CompanyMember> findByCompany_CompanyIdAndRolesInAndIsActiveTrue(Long companyId, Set<CompanyRole> roles);

    default List<CompanyMember> findAdminsByCompany(Long companyId) {
        return findByCompany_CompanyIdAndRolesInAndIsActiveTrue(companyId,
                Set.of(CompanyRole.OWNER, CompanyRole.COMPANY_ADMIN));
    }
}
