package DoAn.BE.chat.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;
import lombok.*;

import DoAn.BE.user.entity.User;

@Entity
@Table(name = "meetings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Meeting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "meeting_id")
    private Long meetingId;

    @Column(nullable = false, length = 200, columnDefinition = "NVARCHAR(200)")
    private String title;

    @Column(length = 1000, columnDefinition = "NVARCHAR(1000)")
    private String description;

    @ManyToOne
    @JoinColumn(name = "room_id", nullable = false)
    private ChatRoom chatRoom;

    @ManyToOne
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @Column(name = "duration")
    private Integer duration; // Duration in minutes

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private MeetingType type = MeetingType.INSTANT;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private MeetingStatus status = MeetingStatus.SCHEDULED;

    @Column(name = "meeting_link", length = 500)
    private String meetingLink;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Participants
    @OneToMany(mappedBy = "meeting", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    @Builder.Default
    private List<MeetingParticipant> participants = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.type == MeetingType.INSTANT) {
            this.status = MeetingStatus.IN_PROGRESS;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Enums
    public enum MeetingType {
        INSTANT, // Cuộc họp ngay
        SCHEDULED // Cuộc họp đã lên lịch
    }

    public enum MeetingStatus {
        SCHEDULED, // Đã lên lịch
        IN_PROGRESS, // Đang diễn ra
        COMPLETED, // Đã kết thúc
        CANCELLED // Đã hủy
    }
}
