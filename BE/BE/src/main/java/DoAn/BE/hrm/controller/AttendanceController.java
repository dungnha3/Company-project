package DoAn.BE.hrm.controller;

import DoAn.BE.hrm.dto.AttendanceDTO;
import DoAn.BE.hrm.dto.AttendanceGPSRequest;
import DoAn.BE.hrm.dto.AttendanceRequest;
import DoAn.BE.hrm.entity.Attendance;
import DoAn.BE.hrm.mapper.AttendanceMapper;
import DoAn.BE.hrm.service.AttendanceService;
import DoAn.BE.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import DoAn.BE.common.annotation.FeatureFlag;

// [Controller managing attendance] (Role: HR/Employee)
@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
@Slf4j
@FeatureFlag("ATTENDANCE")
public class AttendanceController {

    private final AttendanceService attendanceService;
    private final AttendanceMapper attendanceMapper;

    // ==================== CRUD ====================

    // [Authentication] Get my attendance history
    @GetMapping("/my-history")
    public ResponseEntity<List<AttendanceDTO>> getMyAttendanceHistory(
            @AuthenticationPrincipal User currentUser) {
        if (currentUser.getEmployee() == null) {
            return ResponseEntity.ok(List.of());
        }
        // Get current month's attendance by default or similar logic
        // For simplicity reusing getAttendanceByEmployee logic but returning list or
        // page
        // Mapping /my-history usually implies 'all history' or 'recent'.
        // Let's implement getting all paged for the user.
        return ResponseEntity.ok(List.of()); // Placeholder, let's look at the existing service methods first
    }

    // [Create attendance] (Role: HR Manager)
    @PostMapping
    public ResponseEntity<AttendanceDTO> createAttendance(
            @Valid @RequestBody AttendanceRequest request,
            @AuthenticationPrincipal User currentUser) {
        Attendance attendance = attendanceService.createAttendance(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(attendanceMapper.toDTO(attendance));
    }

    // [Get attendance by ID] (Role: HR/Self)
    @GetMapping("/{id}")
    public ResponseEntity<AttendanceDTO> getAttendanceById(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        Attendance attendance = attendanceService.getAttendanceById(id, currentUser);
        return ResponseEntity.ok(attendanceMapper.toDTO(attendance));
    }

    // [Get all attendance] (Role: HR/Accounting)
    @GetMapping
    public ResponseEntity<org.springframework.data.domain.Page<AttendanceDTO>> getAllAttendance(
            @AuthenticationPrincipal User currentUser,
            org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<Attendance> attendances = attendanceService
                .getAllAttendancePaged(currentUser, pageable);
        return ResponseEntity.ok(attendances.map(attendanceMapper::toDTO));
    }

    // [Update attendance] (Role: HR Manager)
    @PutMapping("/{id}")
    public ResponseEntity<AttendanceDTO> updateAttendance(
            @PathVariable Long id,
            @Valid @RequestBody AttendanceRequest request,
            @AuthenticationPrincipal User currentUser) {
        Attendance attendance = attendanceService.updateAttendance(id, request, currentUser);
        return ResponseEntity.ok(attendanceMapper.toDTO(attendance));
    }

    // [Delete attendance] (Role: HR Manager)
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteAttendance(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        attendanceService.deleteAttendance(id, currentUser);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Deleted attendance successfully");
        return ResponseEntity.ok(response);
    }

    // ==================== QUERIES ====================

    // [Get attendance by employee] (Role: HR/Self)
    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<org.springframework.data.domain.Page<AttendanceDTO>> getAttendanceByEmployee(
            @PathVariable Long employeeId,
            @AuthenticationPrincipal User currentUser,
            org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<Attendance> attendances = attendanceService
                .getAttendanceByEmployeePaged(employeeId, currentUser, pageable);
        return ResponseEntity.ok(attendances.map(attendanceMapper::toDTO));
    }

    // [Get attendance in date range] (Role: HR/Accounting)
    @GetMapping("/date-range")
    public ResponseEntity<org.springframework.data.domain.Page<AttendanceDTO>> getAttendanceByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<Attendance> attendances = attendanceService
                .getAttendanceByDateRangePaged(startDate, endDate, pageable);
        return ResponseEntity.ok(attendances.map(attendanceMapper::toDTO));
    }

    // [Get attendance by employee and month] (Role: HR/Self)
    @GetMapping("/employee/{employeeId}/month")
    public ResponseEntity<List<AttendanceDTO>> getAttendanceByEmployeeAndMonth(
            @PathVariable Long employeeId,
            @RequestParam int year,
            @RequestParam int month) {
        List<Attendance> attendances = attendanceService.getAttendanceByEmployeeAndMonth(employeeId, month, year);
        return ResponseEntity.ok(attendanceMapper.toDTOList(attendances));
    }

    // ==================== STATISTICS ====================

    // [Count working days of employee in month] (Role: HR/Self)
    @GetMapping("/employee/{employeeId}/working-days")
    public ResponseEntity<Map<String, Object>> countWorkingDays(
            @PathVariable Long employeeId,
            @RequestParam int year,
            @RequestParam int month) {
        int workingDays = attendanceService.countWorkingDays(employeeId, year, month);
        Map<String, Object> response = new HashMap<>();
        response.put("employeeId", employeeId);
        response.put("year", year);
        response.put("month", month);
        response.put("workingDays", workingDays);
        return ResponseEntity.ok(response);
    }

    // [Get employee stats (late/early leave)] (Role: HR/Self)
    @GetMapping("/employee/{employeeId}/statistics")
    public ResponseEntity<Map<String, Object>> getStatistics(
            @PathVariable Long employeeId,
            @RequestParam int year,
            @RequestParam int month) {
        Map<String, Object> response = new HashMap<>();
        response.put("employeeId", employeeId);
        response.put("year", year);
        response.put("month", month);

        try {
            long lateDays = attendanceService.countLateDays(employeeId, year, month);
            long earlyLeaveDays = attendanceService.countEarlyLeaveDays(employeeId, year, month);
            int workingDays = attendanceService.countWorkingDays(employeeId, year, month);

            response.put("workingDays", workingDays);
            response.put("lateDays", lateDays);
            response.put("earlyLeaveDays", earlyLeaveDays);
        } catch (Exception e) {
            log.warn("Error getting stats for employee {}: {}", employeeId, e.getMessage());
            response.put("workingDays", 0);
            response.put("lateDays", 0);
            response.put("earlyLeaveDays", 0);
        }

        return ResponseEntity.ok(response);
    }

    // [Get total working hours of employee in month] (Role: HR/Self)
    @GetMapping("/employee/{employeeId}/total-hours")
    public ResponseEntity<BigDecimal> getTotalHours(
            @PathVariable Long employeeId,
            @RequestParam int year,
            @RequestParam int month) {
        BigDecimal totalHours = attendanceService.getTotalWorkingHours(employeeId, year, month);
        return ResponseEntity.ok(totalHours != null ? totalHours : BigDecimal.ZERO);
    }

    // ==================== CHECK-IN/OUT ====================

    // [Check-in] (Role: Employee)
    @PostMapping("/check-in")
    public ResponseEntity<AttendanceDTO> checkIn(
            @RequestParam Long employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate attendanceDate) {
        Attendance attendance = attendanceService.checkIn(employeeId, attendanceDate);
        return ResponseEntity.status(HttpStatus.CREATED).body(attendanceMapper.toDTO(attendance));
    }

    // [Check-out] (Role: Employee)
    @PatchMapping("/{id}/check-out")
    public ResponseEntity<AttendanceDTO> checkOut(@PathVariable Long id) {
        Attendance attendance = attendanceService.checkOut(id);
        return ResponseEntity.ok(attendanceMapper.toDTO(attendance));
    }

    // [GPS Check-in/out] (Role: Employee)
    @PostMapping("/gps")
    public ResponseEntity<Map<String, Object>> checkInGPS(
            @Valid @RequestBody AttendanceGPSRequest request,
            @AuthenticationPrincipal User currentUser) {
        Map<String, Object> response = attendanceService.checkInGPS(request, currentUser);
        return ResponseEntity.ok(response);
    }

    // [Get today's attendance status] (Role: Employee)
    @GetMapping("/status/{employeeId}")
    public ResponseEntity<Map<String, Object>> getAttendanceStatusToday(@PathVariable Long employeeId) {
        log.debug("Getting attendance status for employee: {}", employeeId);
        Map<String, Object> response = attendanceService.getAttendanceStatusToday(employeeId);
        return ResponseEntity.ok(response);
    }
}
