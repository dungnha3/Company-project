package DoAn.BE.hrm.controller;


import DoAn.BE.common.context.TenantContext;
import DoAn.BE.hrm.dto.PerformanceDashboardDTO;
import DoAn.BE.hrm.dto.PerformanceRankingDTO;
import DoAn.BE.hrm.dto.SalaryProposalDTO;
import DoAn.BE.hrm.dto.SalaryProposalRequest;
import DoAn.BE.hrm.service.PerformanceService;
import DoAn.BE.hrm.service.SalaryProposalService;
import DoAn.BE.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/hr")
@RequiredArgsConstructor
public class HRPerformanceController {

    private final PerformanceService performanceService;
    private final SalaryProposalService salaryProposalService;

    // --- Performance Dashboard (aggregated) ---

    @GetMapping("/performance/dashboard")
    public ResponseEntity<PerformanceDashboardDTO> getPerformanceDashboard(
            @RequestParam(defaultValue = "all") String period) {
        return ResponseEntity.ok(performanceService.getPerformanceDashboard(period));
    }

    @GetMapping("/performance/employees/{employeeId}/summary")
    public ResponseEntity<PerformanceDashboardDTO.EmployeeSummary> getEmployeePerformanceSummary(
            @PathVariable Long employeeId) {
        return ResponseEntity.ok(performanceService.getEmployeePerformanceSummary(employeeId));
    }

    @GetMapping("/performance/my-stats")
    public ResponseEntity<PerformanceDashboardDTO.MyStats> getMyStats(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(performanceService.getMyStats(currentUser));
    }

    // --- Performance Comparison ---

    @GetMapping("/performance-comparison/me")
    public ResponseEntity<List<PerformanceRankingDTO>> getMyPerformanceComparison(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(performanceService.getMyPerformanceComparison(currentUser));
    }

    @GetMapping("/performance-comparison/projects/{projectId}")
    public ResponseEntity<List<PerformanceRankingDTO>> getProjectPerformanceRanking(
            @PathVariable Long projectId) {
        return ResponseEntity.ok(performanceService.getProjectPerformanceRanking(projectId));
    }

    // --- Salary Proposals ---

    @PostMapping("/proposals")
    public ResponseEntity<SalaryProposalDTO> createProposal(
            @Valid @RequestBody SalaryProposalRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(salaryProposalService.createProposal(request, currentUser));
    }

    @GetMapping("/proposals")
    public ResponseEntity<Page<SalaryProposalDTO>> getCompanyProposals(Pageable pageable) {
        return ResponseEntity.ok(salaryProposalService.getCompanyProposals(TenantContext.getCompanyId(), pageable));
    }

    @PostMapping("/proposals/{proposalId}/approve")
    public ResponseEntity<SalaryProposalDTO> approveProposal(
            @PathVariable Long proposalId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(salaryProposalService.approveProposal(proposalId, currentUser));
    }

    @PostMapping("/proposals/{proposalId}/reject")
    public ResponseEntity<SalaryProposalDTO> rejectProposal(
            @PathVariable Long proposalId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(salaryProposalService.rejectProposal(proposalId, currentUser));
    }
}
