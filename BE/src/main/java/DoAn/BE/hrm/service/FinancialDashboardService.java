package DoAn.BE.hrm.service;

import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.common.service.RevenueProvider;
import DoAn.BE.hrm.dto.DashboardStatsDTO;
import DoAn.BE.hrm.entity.Salary;
import DoAn.BE.hrm.repository.SalaryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

// Financial dashboard statistics: salary, revenue, profit.
// Salary data is permission-gated — only Accounting role can see amounts.
// Extracted from DashboardService to follow Single Responsibility Principle.
// /
@Service
@Transactional(readOnly = true)
@Slf4j
@RequiredArgsConstructor
public class FinancialDashboardService {

    private final SalaryRepository salaryRepository;
    private final AccessControlService accessControlService;
    private final RevenueProvider revenueProvider;

    // ==================== Permission Check (was duplicated 3x)
    // ====================

    // Check if current user has salary view permission.
    // Extracted from DashboardService where it was copy-pasted 3 times.
    // /
    public boolean hasSalaryViewPermission() {
        try {
            accessControlService.checkSalaryViewPermission();
            return true;
        } catch (ForbiddenException e) {
            return false;
        }
    }

    public SalarySnapshot getCurrentMonthSalary() {
        YearMonth currentMonth = YearMonth.now();
        return getSalaryForMonth(currentMonth.getMonthValue(), currentMonth.getYear());
    }

    public SalarySnapshot getSalaryForMonth(int month, int year) {
        List<Salary> salaries = salaryRepository.findByMonthAndYear(month, year);

        long unpaid = salaries.stream()
                .filter(sl -> Salary.PaymentStatus.UNPAID.equals(sl.getPaymentStatus())).count();
        long paid = salaries.stream()
                .filter(sl -> Salary.PaymentStatus.PAID.equals(sl.getPaymentStatus())).count();

        BigDecimal totalSalary = BigDecimal.ZERO;
        if (hasSalaryViewPermission()) {
            totalSalary = salaries.stream()
                    .map(Salary::getNetSalary)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }

        return new SalarySnapshot(unpaid, paid, totalSalary);
    }

    public List<DashboardStatsDTO.MonthlySalaryStats> getSalaryByMonth() {
        List<DashboardStatsDTO.MonthlySalaryStats> stats = new ArrayList<>();
        boolean canViewSalary = hasSalaryViewPermission();

        for (int i = 5; i >= 0; i--) {
            YearMonth month = YearMonth.now().minusMonths(i);
            List<Salary> salaries = salaryRepository.findByMonthAndYear(
                    month.getMonthValue(), month.getYear());

            BigDecimal totalSalary = BigDecimal.ZERO;
            BigDecimal averageSalary = BigDecimal.ZERO;

            if (canViewSalary) {
                totalSalary = salaries.stream()
                        .map(Salary::getNetSalary)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                averageSalary = salaries.size() > 0
                        ? totalSalary.divide(BigDecimal.valueOf(salaries.size()), 2, RoundingMode.HALF_UP)
                        : BigDecimal.ZERO;
            }

            stats.add(new DashboardStatsDTO.MonthlySalaryStats(
                    month.format(DateTimeFormatter.ofPattern("MM/yyyy")),
                    totalSalary,
                    salaries.size(),
                    averageSalary));
        }
        return stats;
    }

    public FinancialOverview getFinancialOverview() {
        BigDecimal totalSalaryCost = BigDecimal.ZERO;
        BigDecimal totalRevenue = BigDecimal.ZERO;

        if (hasSalaryViewPermission()) {
            SalarySnapshot currentMonth = getCurrentMonthSalary();
            totalSalaryCost = currentMonth.totalSalary();
            totalRevenue = revenueProvider.getTotalActiveRevenue();
        }

        return new FinancialOverview(totalSalaryCost, totalRevenue,
                totalRevenue.subtract(totalSalaryCost));
    }

    public record SalarySnapshot(long unpaid, long paid, BigDecimal totalSalary) {
    }

    public record FinancialOverview(BigDecimal totalMonthlyCost, BigDecimal totalRevenue, BigDecimal totalProfit) {
    }
}
