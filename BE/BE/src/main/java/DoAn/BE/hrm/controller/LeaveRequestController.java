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
import java.util.List;
import java.util.Map;

// [Controller managing leave requests] (Role: HR/Employee)
@RestController
@RequestMapping("/api/leave-requests")
@RequiredArgsConstructor
@Slf4j
public class LeaveRequestController {

    private final LeaveRequestService leaveRequestService;
    private final LeaveRequestMapper leaveRequestMapper;

    // ==================== CRUD ====================

    // [Create leave request] (Role: Employee)
    @PostMapping
    public ResponseEntity<LeaveRequestDTO> createLeaveRequest(
            @Valid @RequestBody LeaveRequestRequest request,
            @AuthenticationPrincipal User currentUser) {
        LeaveRequest leaveRequest = leaveRequestService.createLeaveRequest(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(leaveRequestMapper.toDTO(leaveRequest));
    }

    // [Get leave request by ID] (Role: HR/Self)
    @GetMapping("/{id}")
    public ResponseEntity<LeaveRequestDTO> getLeaveRequestById(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        LeaveRequest leaveRequest = leaveRequestService.getLeaveRequestById(id, currentUser);
        return ResponseEntity.ok(leaveRequestMapper.toDTO(leaveRequest));
    }

    // [Get all leave requests] (Role: HR)
    @GetMapping
    public ResponseEntity<List<LeaveRequestDTO>> getAllLeaveRequests(@AuthenticationPrincipal User currentUser) {
        List<LeaveRequest> leaveRequests = leaveRequestService.getAllLeaveRequests(currentUser);
        return ResponseEntity.ok(leaveRequestMapper.toDTOList(leaveRequests));
    }

    // [Update leave request] (Role: Self - only if pending)
    @PutMapping("/{id}")
    public ResponseEntity<LeaveRequestDTO> updateLeaveRequest(
            @PathVariable Long id,
            @Valid @RequestBody LeaveRequestRequest request,
            @AuthenticationPrincipal User currentUser) {
        LeaveRequest leaveRequest = leaveRequestService.updateLeaveRequest(id, request, currentUser);
        return ResponseEntity.ok(leaveRequestMapper.toDTO(leaveRequest));
    }

    // [Delete leave request] (Role: HR/Self - only if pending)
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteLeaveRequest(@PathVariable Long id) {
        leaveRequestService.deleteLeaveRequest(id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Deleted leave request successfully");
        return ResponseEntity.ok(response);
    }

    // ==================== QUERIES ====================

    // [Get leave requests by employee] (Role: HR/Self)
    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<LeaveRequestDTO>> getLeaveRequestsByEmployee(@PathVariable Long employeeId) {
        List<LeaveRequest> leaveRequests = leaveRequestService.getLeaveRequestsByEmployee(employeeId);
        return ResponseEntity.ok(leaveRequestMapper.toDTOList(leaveRequests));
    }

    // [Get leave requests in date range] (Role: HR)
    @GetMapping("/date-range")
    public ResponseEntity<List<LeaveRequestDTO>> getLeaveRequestsInDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        List<LeaveRequest> leaveRequests = leaveRequestService.getLeaveRequestsInDateRange(startDate, endDate);
        return ResponseEntity.ok(leaveRequestMapper.toDTOList(leaveRequests));
    }

    // ==================== STATUS FILTERS ====================

    // [Get pending leave requests] (Role: HR Manager)
    @GetMapping("/pending")
    public ResponseEntity<List<LeaveRequestDTO>> getPendingLeaveRequests() {
        List<LeaveRequest> leaveRequests = leaveRequestService.getPendingLeaveRequests();
        return ResponseEntity.ok(leaveRequestMapper.toDTOList(leaveRequests));
    }

    // [Get approved leave requests] (Role: HR)
    @GetMapping("/approved")
    public ResponseEntity<List<LeaveRequestDTO>> getApprovedLeaveRequests() {
        List<LeaveRequest> leaveRequests = leaveRequestService.getApprovedLeaveRequests();
        return ResponseEntity.ok(leaveRequestMapper.toDTOList(leaveRequests));
    }

    // [Get rejected leave requests] (Role: HR)
    @GetMapping("/rejected")
    public ResponseEntity<List<LeaveRequestDTO>> getRejectedLeaveRequests() {
        List<LeaveRequest> leaveRequests = leaveRequestService.getRejectedLeaveRequests();
        return ResponseEntity.ok(leaveRequestMapper.toDTOList(leaveRequests));
    }

    // ==================== APPROVAL ACTIONS ====================

    // [Approve leave request (PM)] (Role: PM)
    @PatchMapping("/{id}/approve-pm")
    public ResponseEntity<LeaveRequestDTO> approvePM(
            @PathVariable Long id,
            @Valid @RequestBody ApprovalRequest request,
            @AuthenticationPrincipal User currentUser) {
        LeaveRequest leaveRequest = leaveRequestService.approvePM(id, request.getNote(), currentUser);
        return ResponseEntity.ok(leaveRequestMapper.toDTO(leaveRequest));
    }

    // [Approve leave request (Accounting)] (Role: Accounting)
    @PatchMapping("/{id}/approve-accounting")
    public ResponseEntity<LeaveRequestDTO> approveAccounting(
            @PathVariable Long id,
            @Valid @RequestBody ApprovalRequest request,
            @AuthenticationPrincipal User currentUser) {
        LeaveRequest leaveRequest = leaveRequestService.approveAccounting(id, request.getNote(), currentUser);
        return ResponseEntity.ok(leaveRequestMapper.toDTO(leaveRequest));
    }

    // [Reject leave request] (Role: HR Manager)
    @PatchMapping("/{id}/reject")
    public ResponseEntity<LeaveRequestDTO> rejectLeaveRequest(
            @PathVariable Long id,
            @Valid @RequestBody ApprovalRequest request,
            @AuthenticationPrincipal User currentUser) {
        LeaveRequest leaveRequest = leaveRequestService.rejectLeaveRequest(id, request.getNote(), currentUser);
        return ResponseEntity.ok(leaveRequestMapper.toDTO(leaveRequest));
    }

    // ==================== STATISTICS ====================

    // [Get total leave days of employee in year] (Role: HR/Self)
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

    // [Check if employee is on leave] (Role: System)
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
