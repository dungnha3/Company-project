package DoAn.BE.hrm.repository;

import DoAn.BE.hrm.entity.Salary;
import DoAn.BE.hrm.entity.Salary.PaymentStatus;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface SalaryRepository extends JpaRepository<Salary, Long> {

    List<Salary> findByEmployee_EmployeeId(Long employeeId);

    List<Salary> findByMonthAndYear(Integer month, Integer year);

    Optional<Salary> findByEmployee_EmployeeIdAndMonthAndYear(Long employeeId, Integer month, Integer year);

    List<Salary> findByPaymentStatus(PaymentStatus paymentStatus);

    List<Salary> findByPaymentStatusIn(List<PaymentStatus> paymentStatuses);

    @Query("SELECT SUM(s.netSalary) FROM Salary s WHERE s.month = :month AND s.year = :year AND s.paymentStatus = 'PAID'")
    BigDecimal getTotalPaidSalaryByMonth(@Param("month") Integer month, @Param("year") Integer year);

    Long countByPaymentStatus(PaymentStatus paymentStatus);

    List<Salary> findByEmployee_EmployeeIdAndPaymentStatus(Long employeeId, PaymentStatus paymentStatus);

    boolean existsByEmployee_EmployeeIdAndMonthAndYear(Long employeeId, Integer month, Integer year);

    @Query("SELECT s FROM Salary s WHERE (s.year > :startYear OR (s.year = :startYear AND s.month >= :startMonth)) " +
            "AND (s.year < :endYear OR (s.year = :endYear AND s.month <= :endMonth))")
    List<Salary> findByPeriodRange(@Param("startMonth") Integer startMonth, @Param("startYear") Integer startYear,
            @Param("endMonth") Integer endMonth, @Param("endYear") Integer endYear);

    @Query("SELECT SUM(s.netSalary) FROM Salary s WHERE s.employee.employeeId = :employeeId AND s.year = :year")
    BigDecimal getTotalNetSalaryByEmployeeAndYear(@Param("employeeId") Long employeeId, @Param("year") Integer year);

    // Get latest salaries
    @Query(value = "SELECT * FROM salaries s WHERE s.company_id = :#{T(DoAn.BE.common.context.TenantContext).getCompanyId()} "
            +
            "ORDER BY year DESC, month DESC, created_at DESC LIMIT 10", nativeQuery = true)
    List<Salary> findTop10ByOrderByYearDescMonthDescCreatedAtDesc();

    List<Salary> findByYearOrderByMonthAsc(Integer year);

    void deleteByEmployee_EmployeeIdAndMonthAndYear(Long employeeId, Integer month, Integer year);
}
