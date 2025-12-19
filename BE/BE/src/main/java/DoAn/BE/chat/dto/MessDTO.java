package DoAn.BE.chat.dto;

import DoAn.BE.user.dto.UserDTO;
import DoAn.BE.chat.entity.Message;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MessDTO {
    private Long messageId;
    private Long roomId;
    private UserDTO sender;
    private String content;
    private Message.MessageType messageType = Message.MessageType.TEXT;

    private Long fileId;
    private String fileName;
    private String fileUrl;
    private Long fileSize;
    private String fileType;

    private LocalDateTime sentAt;
    private LocalDateTime editedAt;
    private Boolean isDeleted = false;
    private Boolean isEdited = false;
    private Long replyToMessageId;

    // List of users who have seen this message
    private java.util.List<UserDTO> seenBy;
}
