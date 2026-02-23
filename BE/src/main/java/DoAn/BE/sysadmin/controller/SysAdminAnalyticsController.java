package DoAn.BE.sysadmin.controller;

import DoAn.BE.company.repository.CompanyRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import DoAn.BE.project.repository.ProjectRepository;
import DoAn.BE.sysadmin.dto.AnalyticsDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/sysadmin/analytics")
@RequiredArgsConstructor
public class SysAdminAnalyticsController {

    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;

    @GetMapping("/stats")
    public ResponseEntity<AnalyticsDTO.SystemStats> getSystemStats(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        if (!user.isSystemAdminAccount()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        long totalCompanies = companyRepository.count();
        // OPTIMIZED: Use direct count query instead of findAll().stream().filter()
        long activeCompanies = companyRepository.countByIsActiveTrue();
        long totalUsers = userRepository.count();
        long totalProjects = projectRepository.count();

        // Mock revenue: Active companies * $50/month avg (or based on plan)
        // In real app, query Subscription Service
        double estimatedRevenue = activeCompanies * 50.0;

        return ResponseEntity.ok(new AnalyticsDTO.SystemStats(
                totalUsers,
                totalCompanies,
                activeCompanies,
                totalProjects,
                estimatedRevenue));
    }

    @GetMapping("/growth")
    public ResponseEntity<List<AnalyticsDTO.GrowthData>> getGrowthChart(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        if (!user.isSystemAdminAccount()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // Mock growth data for now since created_at might be missing or not populated
        // for historical data
        // In production, use: companyRepository.countByCreatedAtBetween(...)

        List<AnalyticsDTO.GrowthData> growthData = new ArrayList<>();
        LocalDate now = LocalDate.now();

        for (int i = 5; i >= 0; i--) {
            LocalDate month = now.minusMonths(i);
            String monthLabel = month.format(DateTimeFormatter.ofPattern("MM/yyyy"));

            // Generate some realistic looking fake growth
            long newCompanies = 2 + (long) (Math.random() * 5);
            long newUsers = 10 + (long) (Math.random() * 20);

            growthData.add(new AnalyticsDTO.GrowthData(monthLabel, newCompanies, newUsers));
        }

        return ResponseEntity.ok(growthData);
    }
}
