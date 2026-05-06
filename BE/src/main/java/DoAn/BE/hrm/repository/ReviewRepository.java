package DoAn.BE.hrm.repository;

import DoAn.BE.hrm.entity.Review;
import DoAn.BE.hrm.entity.Review.Rating;
import DoAn.BE.hrm.entity.Review.ReviewStatus;
import DoAn.BE.hrm.entity.Review.ReviewType;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

        @EntityGraph(attributePaths = { "employee", "reviewer" })
        List<Review> findByEmployee_EmployeeIdOrderByCreatedAtDesc(Long employeeId);

        @EntityGraph(attributePaths = { "employee", "reviewer" })
        List<Review> findByReviewer_EmployeeIdOrderByCreatedAtDesc(Long reviewerId);

        List<Review> findByReviewPeriodOrderByCreatedAtDesc(String reviewPeriod);

        List<Review> findByReviewTypeOrderByCreatedAtDesc(ReviewType reviewType);

        @EntityGraph(attributePaths = { "employee", "reviewer" })
        List<Review> findByStatusOrderByCreatedAtDesc(ReviewStatus status);

        List<Review> findByRatingOrderByCreatedAtDesc(Rating rating);

        @Query("SELECT r FROM Review r WHERE r.startDate >= :startDate AND r.endDate <= :endDate ORDER BY r.createdAt DESC")
        List<Review> findByDateRange(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

        @Query("SELECT r FROM Review r WHERE r.employee.employeeId = :employeeId AND r.reviewPeriod = :reviewPeriod AND r.reviewType = :reviewType")
        Optional<Review> findByEmployeeAndPeriodAndType(@Param("employeeId") Long employeeId,
                        @Param("reviewPeriod") String reviewPeriod,
                        @Param("reviewType") ReviewType reviewType);


        @EntityGraph(attributePaths = { "employee", "reviewer" })
        @Query("SELECT r FROM Review r WHERE r.status = 'PENDING' ORDER BY r.createdAt ASC")
        List<Review> findPendingApproval();

        @Query("SELECT r FROM Review r WHERE r.rating = 'EXCELLENT' AND YEAR(r.completedDate) = :year ORDER BY r.totalScore DESC")
        List<Review> findExcellentPerformanceByYear(@Param("year") int year);

        @Query("SELECT r.rating, COUNT(r) FROM Review r WHERE YEAR(r.completedDate) = :year GROUP BY r.rating")
        List<Object[]> countByRatingAndYear(@Param("year") int year);

        @Query(value = "SELECT e.* FROM employees e " +
                        "WHERE e.status = 'ACTIVE' " +
                        "AND e.company_id = :#{T(DoAn.BE.common.context.TenantContext).getCompanyId()} " +
                        "AND NOT EXISTS (SELECT 1 FROM reviews r " +
                        "WHERE r.employee_id = e.employee_id " +
                        "AND r.review_period = :reviewPeriod " +
                        "AND r.review_type = :reviewType)", nativeQuery = true)
        List<Object[]> findEmployeesNeedEvaluation(@Param("reviewPeriod") String reviewPeriod,
                        @Param("reviewType") String reviewType);

        @EntityGraph(attributePaths = { "employee", "reviewer" })
        Page<Review> findAllByOrderByCreatedAtDesc(Pageable pageable);

        Page<Review> findByEmployee_EmployeeIdOrderByCreatedAtDesc(Long employeeId, Pageable pageable);
        @Query("SELECT r FROM Review r WHERE r.employee.company.companyId = :companyId ORDER BY r.createdAt DESC")
        List<Review> findByCompanyId(@Param("companyId") Long companyId);
        @Query("SELECT r FROM Review r WHERE r.employee.company.companyId = :companyId ORDER BY r.createdAt DESC")
        Page<Review> findByCompanyId(@Param("companyId") Long companyId, Pageable pageable);

        // Lấy review theo dự án (Module 4)
        @EntityGraph(attributePaths = { "employee", "employee.user", "reviewer" })
        @Query("SELECT r FROM Review r WHERE r.projectId = :projectId ORDER BY r.createdAt DESC")
        List<Review> findByProjectId(@Param("projectId") Long projectId);
}
