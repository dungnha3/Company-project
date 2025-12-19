package DoAn.BE.chat.dto;

import DoAn.BE.chat.entity.Message;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;


@Data
@NoArgsConstructor
@AllArgsConstructor
public class SendMessageRequest {
    
    // roomId được set từ path variable trong controller, không cần trong request body
    private Long roomId;
    
    @Size(max = 4000, message = "Nội dung tin nhắn không được vượt quá 4000 ký tự")
    private String content;
    
    // Mặc định là TEXT, tự động detect nếu có file
    private Message.MessageType messageType = Message.MessageType.TEXT;
    
    // File info (optional - chỉ cần khi gửi file/ảnh)
    private Long fileId;
    private String fileName;
    private String fileUrl;
    private Long fileSize;
    private String fileType;
    
    // Reply info (optional - chỉ cần khi reply tin nhắn)
    private Long replyToMessageId;
}
