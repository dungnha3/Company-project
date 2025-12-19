package DoAn.BE.chat.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.*;

import DoAn.BE.user.entity.User;
import DoAn.BE.storage.entity.File;

// Entity tin nhắn chat (TEXT, FILE, IMAGE) với soft delete và reply support
@Entity
@Table(name = "messages")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Message {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long messageId;

    @ManyToOne
    @JoinColumn(name = "room_id", nullable = false)  
    private ChatRoom chatRoom;

    @ManyToOne
    @JoinColumn(name = "sender_id")  // Allow null for system messages
    private User sender;

    @Column(columnDefinition = "NVARCHAR(MAX)")  
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "message_type", length = 20, nullable = false)
    private MessageType messageType = MessageType.TEXT;

    @ManyToOne
    @JoinColumn(name = "file_id")  
    private File file;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    @Column(name = "edited_at")
    private LocalDateTime editedAt;

    @ManyToOne
    @JoinColumn(name = "reply_to_message_id")
    private Message replyToMessage;

    @PrePersist
    protected void onCreate() {
        this.sentAt = LocalDateTime.now();
    }

    // Constructors
    public Message(ChatRoom chatRoom, User sender, String content) {
        this.chatRoom = chatRoom;
        this.sender = sender;
        this.content = content;
        this.messageType = MessageType.TEXT;
    }

    // Helper methods
    public boolean isTextMessage() {
        return this.messageType == MessageType.TEXT;
    }

    public boolean isFileMessage() {
        return this.messageType == MessageType.FILE || this.messageType == MessageType.IMAGE;
    }

    public void markAsEdited() {
        this.editedAt = LocalDateTime.now();
    }

    // Enum
    public enum MessageType {
        TEXT,
        FILE,
        IMAGE
    }
}