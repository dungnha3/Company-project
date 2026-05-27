package DoAn.BE.hrm.service;

import DoAn.BE.common.context.TenantContext;
import DoAn.BE.company.entity.Company;
import DoAn.BE.company.entity.CompanySettings;
import DoAn.BE.company.repository.CompanyRepository;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.entity.Review;
import DoAn.BE.hrm.entity.Review.ReviewStatus;
import DoAn.BE.hrm.entity.Review.ReviewType;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.hrm.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReviewScheduledService {

    private final CompanyRepository companyRepository;
    private final EmployeeRepository employeeRepository;
    private final ReviewRepository reviewRepository;

    /**
     * Chạy vào ngày 1 hàng tháng lúc 9h sáng.
     * Kiểm tra tất cả công ty bật auto-review, tạo phiếu cho kỳ mới nếu chưa tạo.
     */
    @Scheduled(cron = "0 0 9 1 * *")
    @Transactional
    public void autoCreateReviewCycles() {
        log.info("=== Bắt đầu tạo đánh giá tự động theo chu kỳ ===");

        List<Company> companies = companyRepository.findAll();
        for (Company company : companies) {
            try {
                processCompany(company);
            } catch (Exception e) {
                log.error("Lỗi khi xử lý auto-review cho công ty {}: {}", company.getCompanyId(), e.getMessage(), e);
            }
        }

        log.info("=== Hoàn thành tạo đánh giá tự động ===");
    }

    private void processCompany(Company company) {
        TenantContext.setCompanyId(company.getCompanyId());

        try {
            CompanySettings settings = company.getSettings();
            if (settings == null || !Boolean.TRUE.equals(settings.getAutoReviewEnabled())) {
                log.debug("Công ty {} không bật auto-review, bỏ qua", company.getCompanyId());
                return;
            }

            String currentPeriod = calculateCurrentPeriod(settings.getReviewCycleType());
            String lastCreated = settings.getLastReviewAutoCreate();

            if (currentPeriod.equals(lastCreated)) {
                log.debug("Công ty {} đã tạo đánh giá cho kỳ {}, bỏ qua",
                        company.getCompanyId(), currentPeriod);
                return;
            }

            log.info("Công ty {}: Tạo đánh giá tự động cho kỳ {} (cycle: {})",
                    company.getCompanyId(), currentPeriod, settings.getReviewCycleType());

            ReviewType reviewType = inferReviewType(settings.getReviewCycleType());

            // Lấy tất cả employee active chưa có review cho kỳ này
            List<Object[]> employeesNeedingReview = reviewRepository.findEmployeesNeedingReview(currentPeriod,
                    reviewType.name());

            if (employeesNeedingReview.isEmpty()) {
                log.info("Công ty {}: Không có nhân viên nào cần đánh giá cho kỳ {}", company.getCompanyId(),
                        currentPeriod);
                settings.setLastReviewAutoCreate(currentPeriod);
                return;
            }

            // Tạo review cho từng employee
            int created = 0;
            List<Employee> activeEmployees = employeeRepository.findByStatusAndCompany_CompanyId(
                    DoAn.BE.hrm.entity.Employee.EmployeeStatus.ACTIVE, company.getCompanyId());

            for (Employee employee : activeEmployees) {
                var existing = reviewRepository.findByEmployeeAndPeriodAndType(
                        employee.getEmployeeId(), currentPeriod, reviewType);
                if (existing.isPresent())
                    continue;

                Review review = new Review();
                review.setEmployee(employee);

                // Auto-assign reviewer: first OWNER or COMPANY_ADMIN in the company
                List<Employee> managers = activeEmployees.stream()
                        .filter(e -> e.getCompany() != null &&
                                (e.getCompany().getCompanyId().equals(company.getCompanyId())))
                        .toList();

                Employee reviewer = managers.stream()
                        .filter(e -> e.getUser() != null)
                        .findFirst()
                        .orElse(null);

                review.setReviewer(reviewer);
                review.setReviewPeriod(currentPeriod);
                review.setReviewType(reviewType);
                review.setStartDate(getPeriodStart(currentPeriod));
                review.setEndDate(LocalDate.now());
                review.setStatus(ReviewStatus.IN_PROGRESS);

                reviewRepository.save(review);
                created++;
            }

            settings.setLastReviewAutoCreate(currentPeriod);
            log.info("Công ty {}: Đã tạo {} phiếu đánh giá cho kỳ {}", company.getCompanyId(), created, currentPeriod);

        } finally {
            TenantContext.clear();
        }
    }

    private String calculateCurrentPeriod(String cycleType) {
        LocalDate now = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        int year = now.getYear();
        int month = now.getMonthValue();
        int quarter = (month - 1) / 3 + 1;

        if ("MONTHLY".equals(cycleType)) {
            return String.format("%02d-%d", month, year);
        }
        return String.format("Q%d-%d", quarter, year);
    }

    private ReviewType inferReviewType(String cycleType) {
        if ("MONTHLY".equals(cycleType))
            return ReviewType.PERIODIC;
        return ReviewType.PERIODIC;
    }

    private LocalDate getPeriodStart(String period) {
        try {
            if (period.startsWith("Q")) {
                int q = Integer.parseInt(period.substring(1, 2));
                int year = Integer.parseInt(period.substring(3));
                int month = (q - 1) * 3 + 1;
                return LocalDate.of(year, month, 1);
            } else if (period.contains("-")) {
                String[] parts = period.split("-");
                return LocalDate.of(Integer.parseInt(parts[1]), Integer.parseInt(parts[0]), 1);
            }
        } catch (Exception ignored) {
        }
        return LocalDate.now();
    }
}
