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

    // Find by role
    List<User> findByRole(User.Role role);

    // Search
    @Query("SELECT u FROM User u WHERE " +
            "u.username LIKE %:keyword% OR " +
            "u.email LIKE %:keyword% OR " +
            "u.phoneNumber LIKE %:keyword% OR " +
            "EXISTS (SELECT nv FROM NhanVien nv WHERE nv.user.userId = u.userId AND nv.hoTen LIKE %:keyword%)")
    List<User> searchByKeyword(@Param("keyword") String keyword);

    // Count
    long countByRole(User.Role role);

    long countByIsOnlineTrue();

    // Find inactive users
    List<User> findByIsOnlineTrueAndLastSeenBefore(LocalDateTime cutoffTime);
}
