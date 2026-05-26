package DoAn.BE.hrm.entity;

import DoAn.BE.common.entity.TenantScopedEntity;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;
import java.time.LocalDate;

// Review entity - renamed from DanhGia

// Employee performance reviews
@Entity
@Table(name = "reviews")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = false)
@Filter(name = "tenantFilter", condition = "company_id = :companyId")
public class Review extends TenantScopedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "review_id")
    @EqualsAndHashCode.Include
    private Long reviewId;

    @ManyToOne
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne
    @JoinColumn(name = "reviewer_id", nullable = false)
    private Employee reviewer;

    @Column(name = "review_period", nullable = false, length = 50)
    private String reviewPeriod; // "Q1-2024", "Q2-2024", "2024"

    @Enumerated(EnumType.STRING)
    @Column(name = "review_type", nullable = false, length = 30)
    private ReviewType reviewType;

    @Column(name = "technical_score", precision = 3, scale = 1)
    private BigDecimal technicalScore; // 0.0 - 10.0

    @Column(name = "attitude_score", precision = 3, scale = 1)
    private BigDecimal attitudeScore;

    @Column(name = "soft_skills_score", precision = 3, scale = 1)
    private BigDecimal softSkillsScore;

    @Column(name = "teamwork_score", precision = 3, scale = 1)
    private BigDecimal teamworkScore;

    @Column(name = "total_score", precision = 3, scale = 1)
    private BigDecimal totalScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "rating", length = 20)
    private Rating rating;

    @Column(name = "comments", columnDefinition = "NVARCHAR(MAX)")
    private String comments;

    @Column(name = "next_goals", columnDefinition = "NVARCHAR(MAX)")
    private String nextGoals;

    @Column(name = "development_plan", columnDefinition = "NVARCHAR(MAX)")
    private String developmentPlan;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ReviewStatus status = ReviewStatus.IN_PROGRESS;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "completed_date")
    private LocalDate completedDate;

    // Optional: gắn đánh giá với dự án cụ thể (review theo dự án)
    @Column(name = "project_id")
    private Long projectId;

    @Column(name = "project_name", length = 200)
    private String projectName;

    @Override
    protected void onCreate() {
        super.onCreate();
        calculateTotalScore();
        determineRating();
    }

    @Override
    protected void onUpdate() {
        super.onUpdate();
        calculateTotalScore();
        determineRating();
    }

    private void calculateTotalScore() {
        if (technicalScore != null && attitudeScore != null &&
                softSkillsScore != null && teamworkScore != null) {
            // Weights: Technical 40%, Attitude 30%, Soft Skills 20%, Teamwork 10%
            this.totalScore = technicalScore.multiply(new BigDecimal("0.4"))
                    .add(attitudeScore.multiply(new BigDecimal("0.3")))
                    .add(softSkillsScore.multiply(new BigDecimal("0.2")))
                    .add(teamworkScore.multiply(new BigDecimal("0.1")));
        }
    }

    private void determineRating() {
        if (totalScore != null) {
            if (totalScore.compareTo(new BigDecimal("9.0")) >= 0) {
                this.rating = Rating.EXCELLENT;
            } else if (totalScore.compareTo(new BigDecimal("8.0")) >= 0) {
                this.rating = Rating.GOOD;
            } else if (totalScore.compareTo(new BigDecimal("6.5")) >= 0) {
                this.rating = Rating.SATISFACTORY;
            } else if (totalScore.compareTo(new BigDecimal("5.0")) >= 0) {
                this.rating = Rating.AVERAGE;
            } else {
                this.rating = Rating.POOR;
            }
        }
    }

    public enum ReviewType {
        SPRINT_REVIEW,       // Đánh giá sau sprint
        PROJECT_COMPLETION,  // Đánh giá khi kết thúc dự án
        PERIODIC,            // Định kỳ (tháng/quý)
        PROJECT,             // Gắn với dự án cụ thể
        PROMOTION            // Thăng chức (không liên quan lương)
    }

    public enum Rating {
        EXCELLENT, // XUAT_SAC (9.0-10.0)
        GOOD, // TOT (8.0-8.9)
        SATISFACTORY, // KHA (6.5-7.9)
        AVERAGE, // TRUNG_BINH (5.0-6.4)
        POOR // YEU (<5.0)
    }

    public enum ReviewStatus {
        IN_PROGRESS, // DANG_DANH_GIA
        PENDING, // CHO_DUYET
        APPROVED, // DA_DUYET
        REJECTED // TU_CHOI
    }

}
