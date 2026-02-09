package DoAn.BE.timetracking.controller;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import DoAn.BE.timetracking.dto.CreateTimeLogRequest;
import DoAn.BE.timetracking.dto.TimeLogDTO;
import DoAn.BE.timetracking.service.TimeTrackingService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/timelogs")
@RequiredArgsConstructor
public class TimeLogController {

    private final TimeTrackingService timeTrackingService;

    /**
     * Log time for an issue
     * POST /api/timelogs
     */
    @PostMapping
    public ResponseEntity<TimeLogDTO> logTime(@Valid @RequestBody CreateTimeLogRequest request) {
        TimeLogDTO result = timeTrackingService.logTime(request);
        return ResponseEntity.ok(result);
    }

    /**
     * Get time logs for an issue
     * GET /api/timelogs/issue/{issueId}
     */
    @GetMapping("/issue/{issueId}")
    public ResponseEntity<List<TimeLogDTO>> getIssueTimeLogs(@PathVariable Long issueId) {
        return ResponseEntity.ok(timeTrackingService.getIssueTimeLogs(issueId));
    }

    /**
     * Get my time logs (paginated)
     * GET /api/timelogs/my
     */
    @GetMapping("/my")
    public ResponseEntity<Page<TimeLogDTO>> getMyTimeLogs(Pageable pageable) {
        return ResponseEntity.ok(timeTrackingService.getMyTimeLogs(pageable));
    }

    /**
     * Update a time log
     * PUT /api/timelogs/{logId}
     */
    @PutMapping("/{logId}")
    public ResponseEntity<TimeLogDTO> updateTimeLog(
            @PathVariable Long logId,
            @Valid @RequestBody CreateTimeLogRequest request) {
        return ResponseEntity.ok(timeTrackingService.updateTimeLog(logId, request));
    }

    /**
     * Delete a time log
     * DELETE /api/timelogs/{logId}
     */
    @DeleteMapping("/{logId}")
    public ResponseEntity<Void> deleteTimeLog(@PathVariable Long logId) {
        timeTrackingService.deleteTimeLog(logId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Get total hours for an issue
     * GET /api/timelogs/issue/{issueId}/total
     */
    @GetMapping("/issue/{issueId}/total")
    public ResponseEntity<BigDecimal> getTotalHoursByIssue(@PathVariable Long issueId) {
        return ResponseEntity.ok(timeTrackingService.getTotalHoursByIssue(issueId));
    }
}
