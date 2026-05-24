package DoAn.BE.calendar.controller;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import DoAn.BE.user.entity.User;

import DoAn.BE.calendar.dto.*;
import DoAn.BE.calendar.entity.EventAttendee.ResponseStatus;
import DoAn.BE.calendar.service.CalendarService;
import DoAn.BE.common.service.AccessControlService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/calendar")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CalendarController {

    private final CalendarService calendarService;
    private final AccessControlService accessControlService;

    // Create a new calendar event
    // POST /api/calendar/events
    @PostMapping("/events")
    public ResponseEntity<CalendarEventDTO> createEvent(
            @Valid @RequestBody CreateEventRequest request,
            @AuthenticationPrincipal User currentUser) {
        accessControlService.checkCalendarManagePermission();
        return ResponseEntity.ok(calendarService.createEvent(request));
    }

    // Get events in date range
    // GET /api/calendar/events?start=...&end=...
    @GetMapping("/events")
    public ResponseEntity<List<CalendarEventDTO>> getEvents(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end,
            @AuthenticationPrincipal User currentUser) {
        accessControlService.checkCalendarViewPermission();
        return ResponseEntity.ok(calendarService.getEvents(start, end));
    }

    // Get event by ID
    // GET /api/calendar/events/{eventId}
    @GetMapping("/events/{eventId}")
    public ResponseEntity<CalendarEventDTO> getEvent(
            @PathVariable Long eventId,
            @AuthenticationPrincipal User currentUser) {
        accessControlService.checkCalendarViewPermission();
        return ResponseEntity.ok(calendarService.getEventById(eventId));
    }

    // Update event
    // PUT /api/calendar/events/{eventId}
    @PutMapping("/events/{eventId}")
    public ResponseEntity<CalendarEventDTO> updateEvent(
            @PathVariable Long eventId,
            @Valid @RequestBody CreateEventRequest request,
            @AuthenticationPrincipal User currentUser) {
        accessControlService.checkCalendarManagePermission();
        return ResponseEntity.ok(calendarService.updateEvent(eventId, request));
    }

    // Delete event
    // DELETE /api/calendar/events/{eventId}
    @DeleteMapping("/events/{eventId}")
    public ResponseEntity<Void> deleteEvent(
            @PathVariable Long eventId,
            @AuthenticationPrincipal User currentUser) {
        accessControlService.checkCalendarManagePermission();
        calendarService.deleteEvent(eventId);
        return ResponseEntity.noContent().build();
    }

    // RSVP to an event
    // POST /api/calendar/events/{eventId}/respond?status=ACCEPTED
    @PostMapping("/events/{eventId}/respond")
    public ResponseEntity<Void> respondToEvent(
            @PathVariable Long eventId,
            @RequestParam ResponseStatus status,
            @AuthenticationPrincipal User currentUser) {
        accessControlService.checkCalendarViewPermission();
        calendarService.respondToEvent(eventId, status);
        return ResponseEntity.ok().build();
    }
}
