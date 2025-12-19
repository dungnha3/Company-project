package DoAn.BE.chat.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatRoomMemberId implements Serializable {
    private static final long serialVersionUID = 1L;
    @Column(name = "room_id")
    private Long roomId;

    @Column(name = "user_id")
    private Long userId;
}


