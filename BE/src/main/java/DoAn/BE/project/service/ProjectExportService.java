package DoAn.BE.project.service;

import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.project.entity.Issue;
import DoAn.BE.project.entity.Project;
import DoAn.BE.project.entity.ProjectPhase;
import DoAn.BE.project.repository.IssueRepository;
import DoAn.BE.project.repository.ProjectPhaseRepository;
import DoAn.BE.project.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// [Service xuất dữ liệu Project ra CSV] (Role: Project Member)
@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectExportService {

    private final ProjectRepository projectRepository;
    private final IssueRepository issueRepository;
    private final ProjectPhaseRepository projectPhaseRepository;

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    // [Export Issues ra CSV] (Role: Project Member)
    @Transactional(readOnly = true)
    public byte[] exportIssuesToCsv(Long projectId) throws IOException {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        List<Issue> issues = issueRepository.findByProject_ProjectId(projectId);

        StringBuilder csv = new StringBuilder();
        // Header
        csv.append("Issue Key,Title,Status,Priority,Assignee,Due Date,Phase,Created At\n");

        for (Issue issue : issues) {
            csv.append(escapeCsv(issue.getIssueKey())).append(",");
            csv.append(escapeCsv(issue.getTitle())).append(",");
            csv.append(escapeCsv(issue.getIssueStatus() != null ? issue.getIssueStatus().getName() : "")).append(",");
            csv.append(escapeCsv(issue.getPriority().name())).append(",");
            csv.append(escapeCsv(issue.getAssignee() != null ? issue.getAssignee().getFullName() : "Unassigned"))
                    .append(",");
            csv.append(issue.getDueDate() != null ? issue.getDueDate().format(DATE_FORMAT) : "").append(",");
            csv.append(escapeCsv(issue.getPhase() != null ? issue.getPhase().getName() : "")).append(",");
            csv.append(issue.getCreatedAt() != null
                    ? issue.getCreatedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))
                    : "");
            csv.append("\n");
        }

        log.info("Exported {} issues for project {} to CSV", issues.size(), project.getName());
        return csv.toString().getBytes("UTF-8");
    }

    // [Export Gantt Chart ra CSV] (Role: Project Member)
    @Transactional(readOnly = true)
    public byte[] exportGanttToCsv(Long projectId) throws IOException {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        List<ProjectPhase> phases = projectPhaseRepository.findByProject_ProjectIdOrderByOrderIndexAsc(projectId);

        StringBuilder csv = new StringBuilder();
        csv.append("Type,Name,Start Date,End Date,Status,Progress,Parent Phase\n");

        // Project row
        csv.append("PROJECT,").append(escapeCsv(project.getName())).append(",");
        csv.append(project.getStartDate() != null ? project.getStartDate().format(DATE_FORMAT) : "").append(",");
        csv.append(project.getEndDate() != null ? project.getEndDate().format(DATE_FORMAT) : "").append(",");
        csv.append(project.getStatus()).append(",,\n");

        for (ProjectPhase phase : phases) {
            List<Issue> phaseIssues = issueRepository.findByPhase_PhaseId(phase.getPhaseId());
            int progress = calculateProgress(phaseIssues);

            // Phase row
            csv.append("PHASE,").append(escapeCsv(phase.getName())).append(",");
            csv.append(phase.getStartDate() != null ? phase.getStartDate().format(DATE_FORMAT) : "").append(",");
            csv.append(phase.getEndDate() != null ? phase.getEndDate().format(DATE_FORMAT) : "").append(",");
            csv.append(phase.getStatus()).append(",").append(progress).append("%,\n");

            // Issue rows under phase
            for (Issue issue : phaseIssues) {
                csv.append("ISSUE,").append(escapeCsv(issue.getIssueKey() + " - " + issue.getTitle())).append(",");
                csv.append(issue.getCreatedAt() != null ? issue.getCreatedAt().toLocalDate().format(DATE_FORMAT) : "")
                        .append(",");
                csv.append(issue.getDueDate() != null ? issue.getDueDate().format(DATE_FORMAT) : "").append(",");
                csv.append(issue.getIssueStatus() != null ? issue.getIssueStatus().getName() : "").append(",,");
                csv.append(escapeCsv(phase.getName())).append("\n");
            }
        }

        log.info("Exported Gantt data for project {} with {} phases", project.getName(), phases.size());
        return csv.toString().getBytes("UTF-8");
    }

    private int calculateProgress(List<Issue> issues) {
        if (issues.isEmpty())
            return 0;
        int completed = 0;
        for (Issue issue : issues) {
            if (issue.getIssueStatus() != null) {
                String status = issue.getIssueStatus().getName().toLowerCase();
                if (status.contains("done") || status.contains("closed")) {
                    completed++;
                }
            }
        }
        return (int) (((double) completed / issues.size()) * 100);
    }

    private String escapeCsv(String value) {
        if (value == null)
            return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}
