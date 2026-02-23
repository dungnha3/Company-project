package DoAn.BE.hrm.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.*;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import DoAn.BE.common.context.TenantContext;
import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.DuplicateException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.util.GPSUtil;
import DoAn.BE.common.service.AccessControlService;

import DoAn.BE.company.service.CompanyService;
import DoAn.BE.hrm.dto.AttendanceGPSRequest;
import DoAn.BE.hrm.dto.AttendanceRequest;
import DoAn.BE.hrm.entity.Attendance;
import DoAn.BE.hrm.entity.Attendance.CheckInMethod;
import DoAn.BE.hrm.entity.Attendance.AttendanceStatus;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.repository.AttendanceRepository;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.user.entity.User;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@Slf4j
public class AttendanceService {

    private final CompanyService companyService;
    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;
    private final AccessControlService accessControlService;

    public AttendanceService(AttendanceRepository attendanceRepository,
            EmployeeRepository employeeRepository,
            org.springframework.context.ApplicationEventPublisher eventPublisher,
            CompanyService companyService,
            AccessControlService accessControlService) {
        this.attendanceRepository = attendanceRepository;
        this.employeeRepository = employeeRepository;
        this.eventPublisher = eventPublisher;
        this.companyService = companyService;
        this.accessControlService = accessControlService;
    }

    public Attendance createAttendance(AttendanceRequest request, User currentUser) {

        if (!accessControlService.isHRManager()) {
            throw new ForbiddenException("Only HR Manager can create manual attendance");
        }

        Long employeeId = request.getEmployeeId();
        if (employeeId == null) {
            throw new BadRequestException("Employee ID cannot be empty");
        }

        log.info("HR Manager {} creating manual attendance for employee ID: {}", currentUser.getUsername(), employeeId);

        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

        Attendance attendance = new Attendance();
        attendance.setEmployee(employee);
        attendance.setAttendanceDate(request.getAttendanceDate());
        attendance.setCheckInTime(request.getCheckInTime());
        attendance.setCheckOutTime(request.getCheckOutTime());
        attendance.setStatus(request.getStatus());
        attendance.setNote(request.getNote());
        attendance.setCheckInMethod(CheckInMethod.MANUAL);

        return attendanceRepository.save(attendance);
    }

    public Attendance getAttendanceById(Long id, User currentUser) {
        Attendance attendance = attendanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance record not found"));

        if (accessControlService.isHRManager() || accessControlService.isAccountingManager()) {
            return attendance;
        }

        if (!attendance.getEmployee().getUser().getUserId().equals(currentUser.getUserId())) {
            throw new ForbiddenException("You do not have permission to view this attendance record");
        }

        return attendance;
    }

    public List<Attendance> getAllAttendance(User currentUser) {
        if (!accessControlService.isHRManager() && !accessControlService.isAccountingManager()) {
            throw new ForbiddenException("Only HR/Accounting can view all attendance records");
        }

        Long companyId = TenantContext.getCompanyId();
        if (companyId == null) {
            return java.util.Collections.emptyList();
        }
        return attendanceRepository.findByCompanyId(companyId);
    }

    public org.springframework.data.domain.Page<Attendance> getAllAttendancePaged(User currentUser,
            org.springframework.data.domain.Pageable pageable) {
        if (!accessControlService.isHRManager() && !accessControlService.isAccountingManager()) {
            throw new ForbiddenException("Only HR/Accounting can view all attendance records");
        }

        Long companyId = TenantContext.getCompanyId();
        if (companyId == null) {
            return org.springframework.data.domain.Page.empty(pageable);
        }
        return attendanceRepository.findByCompanyId(companyId, pageable);
    }

    public Attendance updateAttendance(Long id, AttendanceRequest request, User currentUser) {

        if (!accessControlService.isHRManager()) {
            throw new ForbiddenException("Only HR Manager can update attendance");
        }

        log.info("HR Manager {} updating attendance ID: {}", currentUser.getUsername(), id);

        Attendance attendance = attendanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance record not found"));

        if (request.getEmployeeId() != null &&
                !request.getEmployeeId().equals(attendance.getEmployee().getEmployeeId())) {
            throw new DuplicateException("Cannot change employee of attendance record");
        }

        if (request.getAttendanceDate() != null)
            attendance.setAttendanceDate(request.getAttendanceDate());
        if (request.getCheckInTime() != null)
            attendance.setCheckInTime(request.getCheckInTime());
        if (request.getCheckOutTime() != null)
            attendance.setCheckOutTime(request.getCheckOutTime());
        if (request.getStatus() != null)
            attendance.setStatus(request.getStatus());
        if (request.getNote() != null)
            attendance.setNote(request.getNote());

        return attendanceRepository.save(attendance);
    }

    @Transactional(readOnly = true)
    public List<Attendance> getAttendanceByEmployeeAndMonth(Long employeeId, int month, int year) {
        YearMonth yearMonth = YearMonth.of(year, month);
        LocalDate start = yearMonth.atDay(1);
        LocalDate end = yearMonth.atEndOfMonth();
        return attendanceRepository.findByEmployee_EmployeeIdAndAttendanceDateBetween(employeeId, start, end);
    }

    public Attendance checkIn(Long employeeId, LocalDate attendanceDate) {
        User currentUser = employeeRepository.findById(employeeId).map(Employee::getUser).orElseThrow();
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee profile not found"));

        if (!accessControlService.isHRManager()) {
            if (!employee.getUser().getUserId().equals(currentUser.getUserId())) {
                throw new ForbiddenException("You can only check-in for yourself");
            }
        }

        LocalDate today = LocalDate.now();
        Optional<Attendance> existingOpt = attendanceRepository
                .findByEmployee_EmployeeIdAndAttendanceDate(employeeId, today)
                .stream().findFirst();

        if (existingOpt.isPresent()) {
            throw new BadRequestException("You have already checked in for today");
        }

        Attendance attendance = new Attendance();
        attendance.setEmployee(employee);
        attendance.setAttendanceDate(today);
        attendance.setCheckInTime(LocalTime.now());
        attendance.setCheckInMethod(CheckInMethod.MANUAL); // Explicitly MANUAL

        attendance = attendanceRepository.save(attendance);
        sendAttendanceNotification(employee, attendance, true);

        return attendance;
    }

    public Attendance checkOut(Long attendanceId) {
        Attendance attendance = attendanceRepository.findById(attendanceId)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance record not found"));

        if (attendance.getCheckOutTime() != null) {
            throw new BadRequestException("You have already checked out");
        }

        attendance.setCheckOutTime(LocalTime.now());
        attendance = attendanceRepository.save(attendance);

        sendAttendanceNotification(attendance.getEmployee(), attendance, false);
        return attendance;
    }

    public void deleteAttendance(Long id, User currentUser) {

        if (!accessControlService.isHRManager()) {
            throw new ForbiddenException("Only HR Manager can delete attendance");
        }

        Attendance attendance = attendanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance record not found"));
        attendanceRepository.delete(attendance);
    }

    @Transactional(readOnly = true)
    public List<Attendance> getAttendanceByEmployee(Long employeeId, User currentUser) {
        if (employeeId == null)
            throw new BadRequestException("Invalid Employee ID");

        if (!accessControlService.isHRManager() && !accessControlService.isAccountingManager()) {
            Employee employee = employeeRepository.findById(employeeId)
                    .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));
            if (!employee.getUser().getUserId().equals(currentUser.getUserId())) {
                throw new ForbiddenException("You can only view your own attendance records");
            }
        }

        return attendanceRepository.findByEmployee_EmployeeIdOrderByAttendanceDateDesc(employeeId);
    }

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<Attendance> getAttendanceByEmployeePaged(Long employeeId,
            User currentUser, org.springframework.data.domain.Pageable pageable) {
        if (employeeId == null)
            throw new BadRequestException("Invalid Employee ID");

        if (!accessControlService.isHRManager() && !accessControlService.isAccountingManager()) {
            Employee employee = employeeRepository.findById(employeeId)
                    .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));
            if (!employee.getUser().getUserId().equals(currentUser.getUserId())) {
                throw new ForbiddenException("You can only view your own attendance records");
            }
        }

        return attendanceRepository.findByEmployee_EmployeeIdOrderByAttendanceDateDesc(employeeId, pageable);
    }

    @Transactional(readOnly = true)
    public List<Attendance> getAttendanceByDateRange(LocalDate startDate, LocalDate endDate) {
        return attendanceRepository.findByAttendanceDateBetween(startDate, endDate);
    }

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<Attendance> getAttendanceByDateRangePaged(LocalDate startDate,
            LocalDate endDate, org.springframework.data.domain.Pageable pageable) {
        return attendanceRepository.findByAttendanceDateBetween(startDate, endDate, pageable);
    }

    @Transactional(readOnly = true)
    public int countWorkingDays(Long employeeId, int year, int month) {
        YearMonth yearMonth = YearMonth.of(year, month);
        return attendanceRepository.countWorkingDaysByEmployeeAndMonth(employeeId, yearMonth.atDay(1),
                yearMonth.atEndOfMonth());
    }

    @Transactional(readOnly = true)
    public BigDecimal getTotalWorkingHours(Long employeeId, int year, int month) {
        YearMonth yearMonth = YearMonth.of(year, month);
        return attendanceRepository.sumWorkingHoursByEmployeeAndMonth(employeeId, yearMonth.atDay(1),
                yearMonth.atEndOfMonth());
    }

    @Transactional(readOnly = true)
    public long countLateDays(Long employeeId, int year, int month) {
        YearMonth yearMonth = YearMonth.of(year, month);
        return attendanceRepository.countLateDaysByEmployeeAndMonth(employeeId, yearMonth.atDay(1),
                yearMonth.atEndOfMonth());
    }

    @Transactional(readOnly = true)
    public long countEarlyLeaveDays(Long employeeId, int year, int month) {
        YearMonth yearMonth = YearMonth.of(year, month);
        return attendanceRepository.countEarlyLeaveDaysByEmployeeAndMonth(employeeId, yearMonth.atDay(1),
                yearMonth.atEndOfMonth());
    }

    public Map<String, Object> checkInGPS(AttendanceGPSRequest request, User currentUser) {
        log.info("GPS Attendance request from user: {}", currentUser.getUsername());

        Long employeeId = request.getEmployeeId();
        if (employeeId == null) {
            Employee employee = employeeRepository.findByUser_UserId(currentUser.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "No employee profile found linked to this account"));
            employeeId = employee.getEmployeeId();
        } else {
            if (!accessControlService.isHRManager()) {
                Employee myEmp = employeeRepository.findByUser_UserId(currentUser.getUserId()).orElse(null);
                if (myEmp == null || !myEmp.getEmployeeId().equals(employeeId)) {
                    throw new ForbiddenException("You can only check-in for yourself");
                }
            }
        }

        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee profile not found"));

        Long companyId = TenantContext.getCompanyId();
        if (companyId == null)
            throw new BadRequestException("Company not identified");

        var settings = companyService.getSettingsCached(companyId);
        Double officeLat = settings.getOfficeLatitude();
        Double officeLng = settings.getOfficeLongitude();
        Double radius = settings.getAllowedRadius();

        if (officeLat == null || officeLng == null) {
            throw new BadRequestException("Company has not configured office location for GPS attendance");
        }

        double distance = GPSUtil.calculateDistance(request.getLatitude(), request.getLongitude(), officeLat,
                officeLng);
        if (distance > radius) {
            throw new BadRequestException(
                    String.format("You are too far from the office (%.0fm). Allowed radius: %.0fm", distance, radius));
        }

        LocalDate today = LocalDate.now();
        Optional<Attendance> existingOpt = attendanceRepository
                .findByEmployee_EmployeeIdAndAttendanceDate(employeeId, today)
                .stream().findFirst();

        Attendance attendance;
        boolean isCheckIn;

        if (existingOpt.isEmpty()) {
            attendance = new Attendance();
            attendance.setEmployee(employee);
            attendance.setAttendanceDate(today);
            attendance.setCheckInTime(LocalTime.now());
            attendance.setCheckInMethod(CheckInMethod.GPS);
            isCheckIn = true;
        } else {
            attendance = existingOpt.get();
            if (attendance.getCheckOutTime() != null) {
                throw new BadRequestException("You have already completed attendance (Check-out) for today");
            }
            attendance.setCheckOutTime(LocalTime.now());
            isCheckIn = false;
        }

        attendance.setLatitude(request.getLatitude());
        attendance.setLongitude(request.getLongitude());
        attendance.setCheckInAddress(request.getCheckInAddress());
        attendance.setDistance(distance);

        attendance = attendanceRepository.save(attendance);

        sendAttendanceNotification(employee, attendance, isCheckIn);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", isCheckIn ? "Check-in successful!" : "Check-out successful!");
        response.put("isCheckIn", isCheckIn);
        response.put("time", isCheckIn ? attendance.getCheckInTime() : attendance.getCheckOutTime());
        response.put("distance", Math.round(distance));
        response.put("status", attendance.getStatus());

        return response;
    }

    private void sendAttendanceNotification(Employee employee, Attendance attendance, boolean isCheckIn) {
        if (employee.getUser() == null)
            return;
        Long userId = employee.getUser().getUserId();
        String timeStr = (isCheckIn ? attendance.getCheckInTime() : attendance.getCheckOutTime()).toString();

        try {
            if (isCheckIn) {
                if (attendance.getStatus() == AttendanceStatus.LATE) {
                    eventPublisher.publishEvent(new DoAn.BE.hrm.event.HrmEvent(
                            this,
                            DoAn.BE.hrm.event.HrmEvent.Type.ATTENDANCE_LATE,
                            timeStr,
                            userId,
                            "Late Check-in at " + timeStr));
                }
            }
        } catch (Exception e) {
            log.warn("Failed to send attendance notification: {}", e.getMessage());
        }
    }

    public Map<String, Object> getAttendanceStatusToday(Long employeeId) {
        Map<String, Object> response = new HashMap<>();
        if (employeeId == null)
            return Map.of("checkedIn", false, "message", "Invalid ID");

        LocalDate today = LocalDate.now();
        Optional<Attendance> attendanceOpt = attendanceRepository
                .findByEmployee_EmployeeIdAndAttendanceDate(employeeId, today)
                .stream().findFirst();

        if (attendanceOpt.isEmpty()) {
            response.put("checkedIn", false);
            response.put("checkedOut", false);
            response.put("message", "Not Checked-in");
        } else {
            Attendance cc = attendanceOpt.get();
            response.put("checkedIn", true);
            response.put("checkedOut", cc.getCheckOutTime() != null);
            response.put("checkInTime", cc.getCheckInTime());
            response.put("checkOutTime", cc.getCheckOutTime());
            response.put("workingHours", cc.getWorkingHours());
            response.put("status", cc.getStatus());
            response.put("attendanceId", cc.getAttendanceId());
            response.put("message", cc.getCheckOutTime() != null ? "Shift Completed" : "Working");
        }
        return response;
    }
}
