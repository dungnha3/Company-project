package DoAn.BE.chat.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.*;

import DoAn.BE.user.entity.User;

@Entity
@Table(name = "meeting_participants")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MeetingParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "participant_id")
    private Long participantId;

    @ManyToOne
    @JoinColumn(name = "meeting_id", nullable = false)
    private Meeting meeting;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private ParticipantStatus status = ParticipantStatus.INVITED;

    @Column(name = "joined_at")
    private LocalDateTime joinedAt;

    @Column(name = "left_at")
    private LocalDateTime leftAt;

    @Column(name = "invited_at")
    private LocalDateTime invitedAt;

    @PrePersist
    protected void onCreate() {
        this.invitedAt = LocalDateTime.now();
    }

    // Enum
    public enum ParticipantStatus {
        INVITED, // Đã mời
        ACCEPTED, // Đã chấp nhận
        DECLINED, // Từ chối
        JOINED, // Đã tham gia
        LEFT // Đã rời
    }
}
