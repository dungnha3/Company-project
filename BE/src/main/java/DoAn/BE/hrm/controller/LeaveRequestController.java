package DoAn.BE.hrm.controller;

import DoAn.BE.hrm.dto.ApprovalRequest;
import DoAn.BE.hrm.dto.LeaveRequestDTO;
import DoAn.BE.hrm.dto.LeaveRequestRequest;
import DoAn.BE.hrm.entity.LeaveRequest;
import DoAn.BE.hrm.mapper.LeaveRequestMapper;
import DoAn.BE.hrm.service.LeaveRequestService;
import DoAn.BE.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

import DoAn.BE.common.annotation.FeatureFlag;

@RestController
@RequestMapping("/api/leave-requests")
@RequiredArgsConstructor
@Slf4j
@FeatureFlag("LEAVE")
public class LeaveRequestController {

    private final LeaveRequestService leaveRequestService;
    private final LeaveRequestMapper leaveRequestMapper;

    @PostMapping
    public ResponseEntity<LeaveRequestDTO> createLeaveRequest(
            @Valid @RequestBody LeaveRequestRequest request,
            @AuthenticationPrincipal User currentUser) {
        LeaveRequest leaveRequest = leaveRequestService.createLeaveRequest(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(leaveRequestMapper.toDTO(leaveRequest));
    }

    @GetMapping("/{id}")
    public ResponseEntity<LeaveRequestDTO> getLeaveRequestById(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        LeaveRequest leaveRequest = leaveRequestService.getLeaveRequestById(id, currentUser);
        return ResponseEntity.ok(leaveRequestMapper.toDTO(leaveRequest));
    }

    @GetMapping
    public ResponseEntity<org.springframework.data.domain.Page<LeaveRequestDTO>> getAllLeaveRequests(
            @AuthenticationPrincipal User currentUser,
            org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<LeaveRequest> leaveRequests = leaveRequestService
                .getAllLeaveRequestsPaged(currentUser, pageable);
        return ResponseEntity.ok(leaveRequests.map(leaveRequestMapper::toDTO));
    }

    @PutMapping("/{id}")
    public ResponseEntity<LeaveRequestDTO> updateLeaveRequest(
            @PathVariable Long id,
            @Valid @RequestBody LeaveRequestRequest request,
            @AuthenticationPrincipal User currentUser) {
        LeaveRequest leaveRequest = leaveRequestService.updateLeaveRequest(id, request, currentUser);
        return ResponseEntity.ok(leaveRequestMapper.toDTO(leaveRequest));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteLeaveRequest(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        leaveRequestService.deleteLeaveRequest(id, currentUser);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Deleted leave request successfully");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<org.springframework.data.domain.Page<LeaveRequestDTO>> getLeaveRequestsByEmployee(
            @PathVariable Long employeeId,
            @AuthenticationPrincipal User currentUser,
            org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<LeaveRequest> leaveRequests = leaveRequestService
                .getLeaveRequestsByEmployeePaged(employeeId, currentUser, pageable);
        return ResponseEntity.ok(leaveRequests.map(leaveRequestMapper::toDTO));
    }

    @GetMapping("/date-range")
    public ResponseEntity<org.springframework.data.domain.Page<LeaveRequestDTO>> getLeaveRequestsInDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<LeaveRequest> leaveRequests = leaveRequestService
                .getLeaveRequestsInDateRangePaged(startDate, endDate, pageable);
        return ResponseEntity.ok(leaveRequests.map(leaveRequestMapper::toDTO));
    }

    @GetMapping("/pending")
    public ResponseEntity<org.springframework.data.domain.Page<LeaveRequestDTO>> getPendingLeaveRequests(
            org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<LeaveRequest> leaveRequests = leaveRequestService
                .getLeaveRequestsByStatus(LeaveRequest.LeaveStatus.PENDING, pageable);
        return ResponseEntity.ok(leaveRequests.map(leaveRequestMapper::toDTO));
    }

    @GetMapping("/approved")
    public ResponseEntity<org.springframework.data.domain.Page<LeaveRequestDTO>> getApprovedLeaveRequests(
            org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<LeaveRequest> leaveRequests = leaveRequestService
                .getLeaveRequestsByStatus(LeaveRequest.LeaveStatus.APPROVED, pageable);
        return ResponseEntity.ok(leaveRequests.map(leaveRequestMapper::toDTO));
    }

    @GetMapping("/rejected")
    public ResponseEntity<org.springframework.data.domain.Page<LeaveRequestDTO>> getRejectedLeaveRequests(
            org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<LeaveRequest> leaveRequests = leaveRequestService
                .getLeaveRequestsByStatus(LeaveRequest.LeaveStatus.REJECTED, pageable);
        return ResponseEntity.ok(leaveRequests.map(leaveRequestMapper::toDTO));
    }

    // [Approve leave request] (Permission: leaveApprove)
    @PatchMapping("/{id}/approve")
    public ResponseEntity<LeaveRequestDTO> approveLeaveRequest(
            @PathVariable Long id,
            @Valid @RequestBody ApprovalRequest request,
            @AuthenticationPrincipal User currentUser) {
        LeaveRequest leaveRequest = leaveRequestService.approveLeaveRequest(id, request.getNote(), currentUser);
        return ResponseEntity.ok(leaveRequestMapper.toDTO(leaveRequest));
    }

    @PatchMapping("/{id}/reject")
    public ResponseEntity<LeaveRequestDTO> rejectLeaveRequest(
            @PathVariable Long id,
            @Valid @RequestBody ApprovalRequest request,
            @AuthenticationPrincipal User currentUser) {
        LeaveRequest leaveRequest = leaveRequestService.rejectLeaveRequest(id, request.getNote(), currentUser);
        return ResponseEntity.ok(leaveRequestMapper.toDTO(leaveRequest));
    }

    @GetMapping("/employee/{employeeId}/total-days")
    public ResponseEntity<Map<String, Object>> getTotalLeaveDays(
            @PathVariable Long employeeId,
            @RequestParam int year) {
        int totalDays = leaveRequestService.getTotalLeaveDays(employeeId, year);
        Map<String, Object> response = new HashMap<>();
        response.put("employeeId", employeeId);
        response.put("year", year);
        response.put("totalLeaveDays", totalDays);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/employee/{employeeId}/is-on-leave")
    public ResponseEntity<Map<String, Object>> isOnLeave(
            @PathVariable Long employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        boolean onLeave = leaveRequestService.isOnLeave(employeeId, date);
        Map<String, Object> response = new HashMap<>();
        response.put("employeeId", employeeId);
        response.put("date", date);
        response.put("isOnLeave", onLeave);
        return ResponseEntity.ok(response);
    }
}
