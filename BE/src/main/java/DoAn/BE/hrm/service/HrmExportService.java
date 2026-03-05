package DoAn.BE.hrm.service;

import DoAn.BE.common.service.PdfExportService;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.entity.Salary;
import DoAn.BE.hrm.repository.SalaryRepository;
import DoAn.BE.hrm.repository.AttendanceRepository;
import DoAn.BE.hrm.repository.ContractRepository;
import DoAn.BE.hrm.repository.LeaveRequestRepository;
import DoAn.BE.hrm.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

// Service for exporting reports to Excel and PDF
// /
@Service
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("unused") // Placeholder - repositories will be used when implementing Apache POI
public class HrmExportService {

    private final EmployeeRepository employeeRepository;
    private final AttendanceRepository attendanceRepository;
    private final SalaryRepository salaryRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final ContractRepository contractRepository;

    public byte[] exportEmployeesToExcel() throws IOException {
        log.info("Export Employees - Need to implement Apache POI");
        // Placeholder - will implement after adding dependency
        return "Export Employees - Need to implement Apache POI".getBytes();
    }

    public byte[] exportAttendanceToExcel(int month, int year) throws IOException {
        log.info("Export Attendance for {}/{} - Need to implement Apache POI", month, year);
        return "Export Attendance - Need to implement Apache POI".getBytes();
    }

    public byte[] exportSalaryToExcel(int month, int year) throws IOException {
        log.info("Export Salary for {}/{} - Need to implement Apache POI", month, year);
        return "Export Salary - Need to implement Apache POI".getBytes();
    }

    public byte[] exportLeavesToExcel(LocalDate startDate, LocalDate endDate) throws IOException {
        log.info("Export Leaves from {} to {} - Need to implement Apache POI", startDate, endDate);
        return "Export Leaves - Need to implement Apache POI".getBytes();
    }

    // Export employee list to PDF
    // /
    public byte[] exportEmployeesToPdf(PdfExportService pdfService) {
        log.info("Exporting employees to PDF");

        List<Employee> employees = employeeRepository.findAll();

        // Build headers
        List<String> headers = List.of("ID", "Name", "Email", "Department", "Position", "Status");

        // Build rows
        List<List<String>> rows = new ArrayList<>();
        for (Employee emp : employees) {
            String email = emp.getUser() != null ? emp.getUser().getEmail() : "";
            rows.add(List.of(
                    emp.getEmployeeId() != null ? emp.getEmployeeId().toString() : "",
                    emp.getFullName() != null ? emp.getFullName() : "",
                    email,
                    emp.getDepartment() != null ? emp.getDepartment().getName() : "",
                    emp.getPosition() != null ? emp.getPosition().getName() : "",
                    emp.getStatus() != null ? emp.getStatus().name() : ""));
        }

        return pdfService.createDocument()
                .addTitle("Employee List")
                .addSubtitle("Generated on " + PdfExportService.formatDate(LocalDate.now()))
                .addSummary(List.of(
                        new String[] { "Total Employees", String.valueOf(employees.size()) },
                        new String[] { "Report Date", PdfExportService.formatDate(LocalDate.now()) }))
                .addSeparator()
                .addTable(headers, rows)
                .addFooter("Company Report")
                .build();
    }

    // Export salary report to PDF
    // /
    public byte[] exportSalaryToPdf(PdfExportService pdfService, int month, int year) {
        log.info("Exporting salary for {}/{} to PDF", month, year);

        List<Salary> salaries = salaryRepository.findByMonthAndYear(month, year);

        // Calculate totals
        double totalBaseSalary = salaries.stream()
                .mapToDouble(s -> s.getBaseSalary() != null ? s.getBaseSalary().doubleValue() : 0)
                .sum();
        double totalNetSalary = salaries.stream()
                .mapToDouble(s -> s.getNetSalary() != null ? s.getNetSalary().doubleValue() : 0)
                .sum();

        // Build headers
        List<String> headers = List.of("Employee", "Base Salary", "Allowance", "Deductions", "Net Salary");

        // Build rows
        List<List<String>> rows = new ArrayList<>();
        for (Salary sal : salaries) {
            String employeeName = sal.getEmployee() != null ? sal.getEmployee().getFullName() : "N/A";
            rows.add(List.of(
                    employeeName,
                    PdfExportService.formatCurrency(sal.getBaseSalary()),
                    PdfExportService.formatCurrency(sal.getAllowance()),
                    PdfExportService.formatCurrency(sal.getTotalDeductions()),
                    PdfExportService.formatCurrency(sal.getNetSalary())));
        }

        return pdfService.createDocument()
                .addTitle("Salary Report")
                .addSubtitle(String.format("Month %d/%d", month, year))
                .addSummary(List.of(
                        new String[] { "Total Employees", String.valueOf(salaries.size()) },
                        new String[] { "Total Base Salary", PdfExportService.formatCurrency(totalBaseSalary) },
                        new String[] { "Total Net Salary", PdfExportService.formatCurrency(totalNetSalary) },
                        new String[] { "Report Date", PdfExportService.formatDate(LocalDate.now()) }))
                .addSeparator()
                .addSectionHeader("Salary Details")
                .addTable(headers, rows)
                .addFooter("Company Report")
                .build();
    }
}
