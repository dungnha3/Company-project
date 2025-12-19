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
public class MessageStatusId implements Serializable {
    private static final long serialVersionUID = 1L;
    @Column(name = "message_id")
    private Long messageId;

    @Column(name = "user_id")
    private Long userId;
}


