package DoAn.BE.user.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import DoAn.BE.user.entity.User;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // Find by unique fields
    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    // Check exists
    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    // Find by status
    List<User> findByIsActiveTrue();

    List<User> findByIsActiveFalse();

    List<User> findByIsOnlineTrue();

    long countByIsOnlineTrue();

    // Find inactive users
    List<User> findByIsOnlineTrueAndLastSeenBefore(LocalDateTime cutoffTime);

    // Search users
    @Query("SELECT u FROM User u WHERE u.username LIKE %:keyword% OR u.email LIKE %:keyword% OR u.phoneNumber LIKE %:keyword%")
    List<User> searchByKeyword(@Param("keyword") String keyword);

    // Find by reset password token
    Optional<User> findByResetPasswordToken(String token);

    // [OPTIMIZED: Bulk update for resetAllUsersStatus]
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @Query("UPDATE User u SET u.isOnline = false WHERE u.isOnline = true")
    int resetAllOnlineUsersToOffline();

    // [OPTIMIZED: Bulk update for endMeeting]
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @Query("UPDATE User u SET u.presenceStatus = 'ONLINE' WHERE u.presenceStatus = 'IN_MEETING' AND u.userId IN :userIds")
    int updatePresenceStatusFromMeetingToOnline(@Param("userIds") List<Long> userIds);

    // [SAAS] Find users by company with memberships eagerly loaded
    @Query("SELECT DISTINCT u FROM User u " +
            "LEFT JOIN FETCH u.memberships m " +
            "LEFT JOIN FETCH m.company " +
            "WHERE EXISTS (SELECT 1 FROM CompanyMember cm WHERE cm.user = u AND cm.company.companyId = :companyId AND cm.isActive = true)")
    List<User> findUsersByCompanyIdWithMemberships(@Param("companyId") Long companyId);
}
