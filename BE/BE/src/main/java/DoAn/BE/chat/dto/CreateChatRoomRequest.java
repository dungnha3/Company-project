package DoAn.BE.chat.dto;

import java.util.List;

import DoAn.BE.chat.entity.ChatRoom;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateChatRoomRequest {

    @NotBlank(message = "Tên phòng chat không được để trống")
    @Size(max = 100, message = "Tên phòng chat không được vượt quá 100 ký tự")
    private String name;

    @Size(max = 500, message = "URL avatar không được vượt quá 500 ký tự")
    private String avatarUrl;

    private Long projectId;

    @NotNull(message = "Danh sách thành viên không được để trống")
    @Size(min = 1, message = "Phòng chat phải có ít nhất 1 thành viên (ngoài bạn)")
    private List<Long> memberIds;

    @NotNull(message = "Loại phòng chat không được để trống")
    private ChatRoom.RoomType roomType;
}
