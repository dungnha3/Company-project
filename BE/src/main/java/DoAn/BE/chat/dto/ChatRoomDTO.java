package DoAn.BE.chat.dto;

import java.time.LocalDateTime;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import DoAn.BE.chat.entity.ChatRoom;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ChatRoomDTO {
    private Long roomId;
    private String name;
    private String avatarUrl;
    private MemberDTO createdBy;
    private LocalDateTime createdAt;
    private ChatRoom.RoomType roomType;

    private Long projectID;
    private String projectName;
    private List<MemberDTO> members;
    private Integer memberCount;
    private LastMessageDTO lastMessage;
    private LocalDateTime lastMessageAt;
    private Integer unreadCount;

    // Lightweight DTO for members — no password, no fcmToken, no sensitive fields
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class MemberDTO {
        private Long userId;
        private String username;
        private String email;
        private String avatarUrl;
        private String fullName;
    }

    // Lightweight DTO for last message — no raw entity
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class LastMessageDTO {
        private Long messageId;
        private String content;
        private String senderUsername;
        private Long senderId;
        private LocalDateTime createdAt;
        private String messageType;
    }
}
