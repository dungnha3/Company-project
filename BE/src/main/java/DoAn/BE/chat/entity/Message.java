package DoAn.BE.chat.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.*;

import DoAn.BE.user.entity.User;
import DoAn.BE.storage.entity.File;

// Entity tin nhắn chat (TEXT, FILE, IMAGE) với soft delete và reply support
@Entity
@Table(name = "messages", indexes = {
        // Index cho query: findByChatRoom_RoomId (Room's messages - CRITICAL for chat)
        @jakarta.persistence.Index(name = "idx_msg_room", columnList = "room_id"),
        // Index cho query: findBySender (User's sent messages)
        @jakarta.persistence.Index(name = "idx_msg_sender", columnList = "sender_id"),
        // Index cho query: findByCreatedAt (Pagination by time)
        @jakarta.persistence.Index(name = "idx_msg_created", columnList = "created_at"),
        // Index cho query: findByIsDeleted (Non-deleted messages)
        @jakarta.persistence.Index(name = "idx_msg_deleted", columnList = "is_deleted")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = false)
public class Message extends DoAn.BE.common.entity.BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long messageId;

    @ManyToOne
    @JoinColumn(name = "room_id", nullable = false)
    private ChatRoom chatRoom;

    @ManyToOne
    @JoinColumn(name = "sender_id") // Allow null for system messages
    private User sender;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "message_type", length = 20, nullable = false)
    private MessageType messageType = MessageType.TEXT;

    @ManyToOne
    @JoinColumn(name = "file_id")
    private File file;

    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    @ManyToOne
    @JoinColumn(name = "reply_to_message_id")
    private Message replyToMessage;

    // Constructors
    public Message(ChatRoom chatRoom, User sender, String content) {
        this.chatRoom = chatRoom;
        this.sender = sender;
        this.content = content;
        this.messageType = MessageType.TEXT;
    }

    public boolean isTextMessage() {
        return this.messageType == MessageType.TEXT;
    }

    public boolean isFileMessage() {
        return this.messageType == MessageType.FILE || this.messageType == MessageType.IMAGE;
    }

    public void markAsEdited() {
        this.setUpdatedAt(LocalDateTime.now());
    }

    public enum MessageType {
        TEXT,
        FILE,
        IMAGE,
        SYSTEM
    }
}
