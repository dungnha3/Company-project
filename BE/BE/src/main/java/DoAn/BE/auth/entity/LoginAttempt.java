package DoAn.BE.auth.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

// [Entity lưu lịch sử đăng nhập - ngăn brute force] (Role: Security)
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "login_attempts", indexes = {
        // Index cho query: findByUsernameAndAttemptedAtAfter (Rate limiting)
        @jakarta.persistence.Index(name = "idx_la_username_time", columnList = "username, attempted_at"),
        // Index cho query: findByIpAddress (IP blocking)
        @jakarta.persistence.Index(name = "idx_la_ip", columnList = "ip_address")
})
public class LoginAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "username", length = 50)
    private String username;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "success", nullable = false)
    private Boolean success;

    @Column(name = "failure_reason", length = 200)
    private String failureReason;

    @Column(name = "attempted_at")
    private LocalDateTime attemptedAt;

    @PrePersist
    protected void onCreate() {
        this.attemptedAt = LocalDateTime.now();
    }

    // Factory method tạo login attempt thành công
    public static LoginAttempt success(String username, String ipAddress) {
        LoginAttempt attempt = new LoginAttempt();
        attempt.setUsername(username);
        attempt.setIpAddress(ipAddress);
        attempt.setSuccess(true);
        return attempt;
    }

    // Factory method tạo login attempt thất bại
    public static LoginAttempt failure(String username, String ipAddress, String reason) {
        LoginAttempt attempt = new LoginAttempt();
        attempt.setUsername(username);
        attempt.setIpAddress(ipAddress);
        attempt.setSuccess(false);
        attempt.setFailureReason(reason);
        return attempt;
    }
}
