package DoAn.BE.chat.dto;

import DoAn.BE.user.dto.UserDTO;
import DoAn.BE.chat.entity.Message;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.Builder;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessDTO {
    private Long messageId;
    private Long roomId;
    private UserDTO sender;
    private String content;
    private Message.MessageType messageType;

    private Long fileId;
    private String fileName;
    private String fileUrl;
    private Long fileSize;
    private String fileType;

    private LocalDateTime sentAt;
    private LocalDateTime editedAt;
    private Boolean isDeleted;
    private Boolean isEdited;

    // Reply support
    private Long replyToMessageId;
    private ReplyToDTO replyTo;

    // Reactions: emoji -> list of usernames
    private Map<String, List<String>> reactions;

    // List of users who have seen this message
    private List<UserDTO> seenBy;

    // Inner DTO for quoted reply message
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReplyToDTO {
        private Long messageId;
        private String senderName;
        private String content; // truncated to 100 chars
    }
}
