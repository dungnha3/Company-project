package DoAn.BE.chat.entity;

import DoAn.BE.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

// [Entity thành viên chat room] (Role: Data Model)
@Entity
@Table(name = "chat_room_members", indexes = {
        // Index cho query: findByUser_UserId (User's chat rooms - CRITICAL)
        @jakarta.persistence.Index(name = "idx_crm_user", columnList = "user_id"),
        // Index cho query: findByChatRoom_RoomId (Room's members)
        @jakarta.persistence.Index(name = "idx_crm_room", columnList = "room_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatRoomMember {

    @EmbeddedId
    private ChatRoomMemberId id;

    @ManyToOne
    @MapsId("roomId")
    @JoinColumn(name = "room_id", nullable = false)
    private ChatRoom chatRoom;

    @ManyToOne
    @MapsId("userId")
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private MemberRole role = MemberRole.MEMBER;

    @Column(name = "joined_at")
    private LocalDateTime joinedAt;

    @PrePersist
    protected void onCreate() {
        this.joinedAt = LocalDateTime.now();
    }

    public enum MemberRole {
        ADMIN,
        MEMBER
    }
}
