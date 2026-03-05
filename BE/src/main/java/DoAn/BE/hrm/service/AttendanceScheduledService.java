package DoAn.BE.hrm.service;

import DoAn.BE.hrm.entity.Attendance;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.repository.AttendanceRepository;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.hrm.event.HrmEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class AttendanceScheduledService {

    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final DoAn.BE.notification.service.FCMService fcmService;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Scheduled(cron = "0 30 17 * * MON-FRI")
    @Transactional(readOnly = true)
    public void remindCheckout() {
        log.info("Starting checkout reminder...");

        LocalDate today = LocalDate.now();

        // OPTIMIZED: Only get active employees instead of all
        List<Employee> activeEmployees = employeeRepository.findByStatus(Employee.EmployeeStatus.ACTIVE);

        int reminderCount = 0;
        for (Employee employee : activeEmployees) {
            try {
                // Check if employee has checked in but not checked out
                List<Attendance> todayAttendance = attendanceRepository
                        .findByEmployee_EmployeeIdAndAttendanceDate(employee.getEmployeeId(), today);

                if (!todayAttendance.isEmpty()) {
                    Attendance attendance = todayAttendance.get(0);

                    // Has check-in but no check-out
                    if (attendance.getCheckInTime() != null && attendance.getCheckOutTime() == null) {
                        if (employee.getUser() != null) {
                            eventPublisher.publishEvent(new HrmEvent(
                                    this, HrmEvent.Type.CHECKOUT_REMINDER, null,
                                    employee.getUser().getUserId(), "Checkout Reminder"));

                            // Push FCM notification
                            if (employee.getUser().getFcmToken() != null) {
                                Map<String, String> data = new HashMap<>();
                                data.put("type", "ATTENDANCE_CHECKOUT_REMINDER");
                                data.put("link", "/attendance");
                                fcmService.sendToDevice(
                                        employee.getUser().getFcmToken(),
                                        "Checkout Reminder",
                                        "You haven't checked out today. Please check out before leaving!",
                                        data);
                            }

                            reminderCount++;
                        }
                    }
                }
            } catch (Exception e) {
                log.error("Error sending checkout reminder for employee {}: {}",
                        employee.getFullName(), e.getMessage());
            }
        }

        log.info("Finished checkout reminders. Sent {} reminders", reminderCount);
    }

    @Scheduled(cron = "0 0 20 * * MON-FRI")
    @Transactional(readOnly = true)
    public void checkMissingAttendance() {
        log.info("Starting missing attendance check...");

        LocalDate today = LocalDate.now();
        String dateStr = today.format(DATE_FORMATTER);

        // OPTIMIZED: Only get active employees instead of all
        List<Employee> activeEmployees = employeeRepository.findByStatus(Employee.EmployeeStatus.ACTIVE);

        int missingCount = 0;
        for (Employee employee : activeEmployees) {
            try {
                // Check if employee has attendance record today
                List<Attendance> todayAttendance = attendanceRepository
                        .findByEmployee_EmployeeIdAndAttendanceDate(employee.getEmployeeId(), today);

                if (todayAttendance.isEmpty()) {
                    // No attendance record - send notification
                    if (employee.getUser() != null) {
                        eventPublisher.publishEvent(new HrmEvent(
                                this, HrmEvent.Type.MISSING_ATTENDANCE, dateStr,
                                employee.getUser().getUserId(), "Missing Attendance"));
                        missingCount++;
                        log.debug("Sent missing attendance notification for: {}", employee.getFullName());
                    }
                } else {
                    Attendance attendance = todayAttendance.get(0);

                    // Has check-in but no check-out
                    if (attendance.getCheckInTime() != null && attendance.getCheckOutTime() == null) {
                        if (employee.getUser() != null) {
                            eventPublisher.publishEvent(new HrmEvent(
                                    this, HrmEvent.Type.MISSING_ATTENDANCE, dateStr + " (Missing Checkout)",
                                    employee.getUser().getUserId(), "Missing Checkout"));

                            // Push FCM notification
                            if (employee.getUser().getFcmToken() != null) {
                                Map<String, String> data = new HashMap<>();
                                data.put("type", "ATTENDANCE_MISSING_CHECKOUT");
                                data.put("link", "/attendance");
                                fcmService.sendToDevice(
                                        employee.getUser().getFcmToken(),
                                        "Missing Checkout",
                                        "You haven't checked out on " + dateStr,
                                        data);
                            }

                            missingCount++;
                        }
                    }
                }
            } catch (Exception e) {
                log.error("Error checking attendance for employee {}: {}",
                        employee.getFullName(), e.getMessage());
            }
        }

        log.info("Finished missing attendance check. Sent {} notifications", missingCount);
    }

    @Scheduled(cron = "0 0 9 1 * *")
    @Transactional(readOnly = true)
    public void sendMonthlySummary() {
        log.info("Starting monthly summary...");

        LocalDate lastMonth = LocalDate.now().minusMonths(1);
        LocalDate firstDayOfLastMonth = lastMonth.withDayOfMonth(1);
        LocalDate lastDayOfLastMonth = lastMonth.withDayOfMonth(lastMonth.lengthOfMonth());

        String monthStr = lastMonth.format(DateTimeFormatter.ofPattern("MM/yyyy"));

        // OPTIMIZED: Only get active employees instead of all
        List<Employee> activeEmployees = employeeRepository.findByStatus(Employee.EmployeeStatus.ACTIVE);

        int summaryCount = 0;
        for (Employee employee : activeEmployees) {
            try {
                // Get attendance records for last month
                List<Attendance> monthAttendance = attendanceRepository
                        .findByEmployee_EmployeeIdAndAttendanceDateBetween(
                                employee.getEmployeeId(),
                                firstDayOfLastMonth,
                                lastDayOfLastMonth);

                int totalDays = monthAttendance.size();
                int lateDays = (int) monthAttendance.stream()
                        .filter(cc -> cc.getStatus() == Attendance.AttendanceStatus.LATE)
                        .count();

                // Calculate absent days (working days - attendance days)
                int workingDays = 22; // Estimated working days per month (excludes weekends)
                int absentDays = Math.max(0, workingDays - totalDays);

                if (employee.getUser() != null) {
                    eventPublisher.publishEvent(new HrmEvent(
                            this, HrmEvent.Type.MONTHLY_SUMMARY, new int[] { totalDays, lateDays, absentDays },
                            employee.getUser().getUserId(), monthStr));
                    summaryCount++;
                }
            } catch (Exception e) {
                log.error("Error sending monthly summary for employee {}: {}",
                        employee.getFullName(), e.getMessage());
            }
        }

        log.info("Finished monthly summary. Sent {} summaries", summaryCount);
    }
}
