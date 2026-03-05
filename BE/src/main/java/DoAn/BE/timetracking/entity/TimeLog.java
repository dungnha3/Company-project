package DoAn.BE.timetracking.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.*;

import DoAn.BE.company.entity.Company;
import DoAn.BE.project.entity.Issue;
import DoAn.BE.user.entity.User;

// Entity lưu trữ log thời gian làm việc cho từng issue
// Cho phép track chi tiết ai làm gì, bao lâu, khi nào
// /
@Entity
@Table(name = "time_logs", indexes = {
        @Index(name = "idx_timelog_issue", columnList = "issue_id"),
        @Index(name = "idx_timelog_user", columnList = "user_id"),
        @Index(name = "idx_timelog_company", columnList = "company_id"),
        @Index(name = "idx_timelog_work_date", columnList = "work_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class TimeLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id")
    @EqualsAndHashCode.Include
    private Long logId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "issue_id", nullable = false)
    private Issue issue;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(name = "logged_hours", precision = 5, scale = 2, nullable = false)
    private BigDecimal loggedHours;

    @Column(name = "work_date", nullable = false)
    private LocalDate workDate;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String description;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
