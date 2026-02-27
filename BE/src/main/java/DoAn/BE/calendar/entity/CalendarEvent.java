package DoAn.BE.calendar.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.*;

import DoAn.BE.company.entity.Company;
import DoAn.BE.project.entity.Issue;
import DoAn.BE.project.entity.Project;
import DoAn.BE.user.entity.User;

// Entity lưu trữ các sự kiện calendar
// Hỗ trợ: meetings, deadlines, reminders, holidays
// /
@Entity
@Table(name = "calendar_events", indexes = {
        @Index(name = "idx_event_company", columnList = "company_id"),
        @Index(name = "idx_event_creator", columnList = "created_by"),
        @Index(name = "idx_event_start", columnList = "start_time"),
        @Index(name = "idx_event_project", columnList = "project_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CalendarEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "event_id")
    private Long eventId;

    @Column(nullable = false, length = 255, columnDefinition = "NVARCHAR(255)")
    private String title;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String description;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalDateTime endTime;

    @Builder.Default
    @Column(name = "all_day")
    private Boolean allDay = false;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", length = 20)
    private EventType eventType = EventType.MEETING;

    @Column(length = 255, columnDefinition = "NVARCHAR(255)")
    private String location;

    @Column(name = "meeting_link", length = 500)
    private String meetingLink;

    @Column(name = "recurrence_rule", length = 255)
    private String recurrenceRule; // RRULE format for recurring events

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "issue_id")
    private Issue issue; // Link to issue for deadline events

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = true)
    private Company company;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum EventType {
        MEETING, // Cuộc họp
        DEADLINE, // Deadline task/issue
        REMINDER, // Nhắc nhở
        HOLIDAY, // Ngày nghỉ
        OTHER // Khác
    }
}
