package DoAn.BE.calendar.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import DoAn.BE.calendar.dto.*;
import DoAn.BE.calendar.entity.*;
import DoAn.BE.calendar.entity.EventAttendee.ResponseStatus;
import DoAn.BE.calendar.repository.*;
import DoAn.BE.common.context.TenantContext;
import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.common.util.SecurityUtil;
import DoAn.BE.company.entity.Company;
import DoAn.BE.company.repository.CompanyRepository;
import DoAn.BE.project.repository.IssueRepository;
import DoAn.BE.project.repository.ProjectRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class CalendarService {

    private final CalendarEventRepository eventRepository;
    private final EventAttendeeRepository attendeeRepository;
    private final CompanyRepository companyRepository;
    private final ProjectRepository projectRepository;
    private final IssueRepository issueRepository;
    private final UserRepository userRepository;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;

    // Create a new calendar event
    // /
    @Transactional
    public CalendarEventDTO createEvent(CreateEventRequest request) {
        User currentUser = SecurityUtil.getCurrentUser();
        Long companyId = TenantContext.getCompanyId();

        // Validate endTime > startTime
        if (request.getEndTime() != null && request.getStartTime() != null
                && request.getEndTime().isBefore(request.getStartTime())) {
            throw new BadRequestException("End time must be after start time");
        }

        Company company = null;
        if (companyId != null) {
            company = companyRepository.findById(companyId)
                    .orElseThrow(() -> new ResourceNotFoundException("Company not found"));
        } else {
            // Personal Workspace - Ensure event type is handled or allow it
            // Typically we might enforce EventType.PERSONAL if company is null, but for now
            // let's allow all.
        }

        CalendarEvent event = CalendarEvent.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .allDay(request.getAllDay())
                .eventType(request.getEventType())
                .location(request.getLocation())
                .meetingLink(request.getMeetingLink())
                .recurrenceRule(request.getRecurrenceRule())
                .createdBy(currentUser)
                .company(company) // Nullable now
                .build();

        // Link to project if specified
        if (request.getProjectId() != null) {
            event.setProject(projectRepository.getReferenceById(request.getProjectId()));
        }

        // Link to issue if specified
        if (request.getIssueId() != null) {
            event.setIssue(issueRepository.getReferenceById(request.getIssueId()));
        }

        event = eventRepository.save(event);

        // Add attendees
        if (request.getAttendeeIds() != null && !request.getAttendeeIds().isEmpty()) {
            for (Long userId : request.getAttendeeIds()) {
                EventAttendee attendee = EventAttendee.builder()
                        .event(event)
                        .user(userRepository.getReferenceById(userId))
                        .responseStatus(ResponseStatus.PENDING)
                        .build();
                attendeeRepository.save(attendee);
            }
        }

        log.info("Created calendar event: {} by user {}", event.getTitle(), currentUser.getUserId());

        CalendarEventDTO dto = toDTO(event);

        // Publish Event
        eventPublisher.publishEvent(new DoAn.BE.calendar.event.CalendarAppEvent(this,
                DoAn.BE.calendar.event.CalendarAppEvent.Type.EVENT_CREATED, dto, currentUser.getUserId()));

        return dto;
    }

    // Get events in date range for current company
    // /
    public List<CalendarEventDTO> getEvents(LocalDateTime start, LocalDateTime end) {
        Long companyId = TenantContext.getCompanyId();
        User currentUser = SecurityUtil.getCurrentUser();

        List<CalendarEvent> events;
        if (companyId != null) {
            events = eventRepository.findByCompany_CompanyIdAndStartTimeBetween(companyId, start, end);
        } else {
            // Personal Workspace - Fetch events created by user
            events = eventRepository.findByCreatedBy_UserIdAndStartTimeBetween(currentUser.getUserId(), start, end);
        }

        return events.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    // Get event by ID
    // /
    public CalendarEventDTO getEventById(Long eventId) {
        CalendarEvent event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sự kiện"));
        return toDTO(event);
    }

    // Update event
    // /
    @Transactional
    public CalendarEventDTO updateEvent(Long eventId, CreateEventRequest request) {
        User currentUser = SecurityUtil.getCurrentUser();

        CalendarEvent event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sự kiện"));

        // Only creator can update
        if (!event.getCreatedBy().getUserId().equals(currentUser.getUserId())) {
            throw new ForbiddenException("Bạn không có quyền sửa sự kiện này");
        }

        event.setTitle(request.getTitle());
        event.setDescription(request.getDescription());
        event.setStartTime(request.getStartTime());
        event.setEndTime(request.getEndTime());
        event.setAllDay(request.getAllDay());
        event.setEventType(request.getEventType());
        event.setLocation(request.getLocation());
        event.setMeetingLink(request.getMeetingLink());

        event = eventRepository.save(event);
        return toDTO(event);
    }

    // Delete event
    // /
    @Transactional
    public void deleteEvent(Long eventId) {
        User currentUser = SecurityUtil.getCurrentUser();

        CalendarEvent event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sự kiện"));

        if (!event.getCreatedBy().getUserId().equals(currentUser.getUserId())) {
            throw new ForbiddenException("Bạn không có quyền xóa sự kiện này");
        }

        attendeeRepository.deleteByEvent_EventId(eventId);
        eventRepository.delete(event);
    }

    // RSVP to an event
    // /
    @Transactional
    public void respondToEvent(Long eventId, ResponseStatus response) {
        User currentUser = SecurityUtil.getCurrentUser();

        List<EventAttendee> attendees = attendeeRepository.findByEvent_EventId(eventId);
        EventAttendee myAttendee = attendees.stream()
                .filter(a -> a.getUser().getUserId().equals(currentUser.getUserId()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Bạn không được mời vào sự kiện này"));

        myAttendee.setResponseStatus(response);
        attendeeRepository.save(myAttendee);
    }

    // Convert entity to DTO
    // /
    private CalendarEventDTO toDTO(CalendarEvent event) {
        List<AttendeeDTO> attendees = attendeeRepository.findByEvent_EventId(event.getEventId())
                .stream()
                .map(a -> AttendeeDTO.builder()
                        .userId(a.getUser().getUserId())
                        .userName(a.getUser().getUsername())
                        .userAvatar(a.getUser().getAvatarUrl())
                        .responseStatus(a.getResponseStatus())
                        .build())
                .collect(Collectors.toList());

        return CalendarEventDTO.builder()
                .eventId(event.getEventId())
                .title(event.getTitle())
                .description(event.getDescription())
                .startTime(event.getStartTime())
                .endTime(event.getEndTime())
                .allDay(event.getAllDay())
                .eventType(event.getEventType())
                .location(event.getLocation())
                .meetingLink(event.getMeetingLink())
                .recurrenceRule(event.getRecurrenceRule())
                .createdById(event.getCreatedBy().getUserId())
                .createdByName(event.getCreatedBy().getUsername())
                .projectId(event.getProject() != null ? event.getProject().getProjectId() : null)
                .projectName(event.getProject() != null ? event.getProject().getName() : null)
                .issueId(event.getIssue() != null ? event.getIssue().getIssueId() : null)
                .issueKey(event.getIssue() != null ? event.getIssue().getIssueKey() : null)
                .attendees(attendees)
                .createdAt(event.getCreatedAt())
                .build();
    }
}
