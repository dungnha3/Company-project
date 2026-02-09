package DoAn.BE.chat.dto;

import java.time.LocalDateTime;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import DoAn.BE.chat.entity.ChatRoom;
import DoAn.BE.chat.entity.Message;
import DoAn.BE.user.entity.User;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ChatRoomDTO {
    private Long roomId;
    private String name;
    private String avatarUrl;
    private User createdBy;
    private LocalDateTime createdAt;
    private ChatRoom.RoomType roomType;

    private Long projectID;
    private String projectName;
    private List<User> members;
    private Integer memberCount;
    private Message lastMessage;
    private LocalDateTime lastMessageAt;
    private Integer unreadCount;
}
