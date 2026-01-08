package DoAn.BE.project.controller;

import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import DoAn.BE.project.service.ProjectExportService;
import lombok.RequiredArgsConstructor;

// [Controller xuất dữ liệu Project] (Role: Project Member)
@RestController
@RequestMapping("/api/project-export")
@RequiredArgsConstructor
public class ProjectExportController {

    private final ProjectExportService projectExportService;

    // [Export Issues ra CSV] (Role: Project Member)
    @GetMapping("/{projectId}/issues/csv")
    public ResponseEntity<byte[]> exportIssuesToCsv(@PathVariable Long projectId) throws IOException {
        byte[] csvData = projectExportService.exportIssuesToCsv(projectId);
        String filename = "Issues_Project_" + projectId + "_"
                + LocalDate.now().format(DateTimeFormatter.ofPattern("ddMMyyyy")) + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csvData);
    }

    // [Export Gantt Chart ra CSV] (Role: Project Member)
    @GetMapping("/{projectId}/gantt/csv")
    public ResponseEntity<byte[]> exportGanttToCsv(@PathVariable Long projectId) throws IOException {
        byte[] csvData = projectExportService.exportGanttToCsv(projectId);
        String filename = "Gantt_Project_" + projectId + "_"
                + LocalDate.now().format(DateTimeFormatter.ofPattern("ddMMyyyy")) + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csvData);
    }
}
