package DoAn.BE.calendar.entity;

import jakarta.persistence.*;
import lombok.*;

import DoAn.BE.user.entity.User;

// Entity lưu trữ danh sách người tham dự sự kiện
// Hỗ trợ RSVP (response status)
// /
@Entity
@Table(name = "event_attendees", indexes = {
        @Index(name = "idx_attendee_event", columnList = "event_id"),
        @Index(name = "idx_attendee_user", columnList = "user_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventAttendee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private CalendarEvent event;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "response_status", length = 20)
    private ResponseStatus responseStatus = ResponseStatus.PENDING;

    public enum ResponseStatus {
        PENDING, // Chưa phản hồi
        ACCEPTED, // Đã chấp nhận
        DECLINED, // Từ chối
        TENTATIVE // Có thể tham gia
    }
}
