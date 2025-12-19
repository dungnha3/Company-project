package DoAn.BE.chat.entity;

import java.time.LocalDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;
import lombok.*;

import DoAn.BE.user.entity.User;
import DoAn.BE.project.entity.Project;

// Entity phòng chat (hỗ trợ 3 loại: DIRECT 1-1, GROUP, PROJECT)
@Entity
@Table(name = "chat_rooms")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "room_id")
    private Long roomId; // Hoặc chatRoomId nếu muốn giữ tên

    @Column(length = 100, columnDefinition = "NVARCHAR(100)")
    private String name; // Có thể NULL (DIRECT chat không có tên)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RoomType type = RoomType.GROUP;

    @ManyToOne
    @JoinColumn(name = "project_id")
    private Project project; // NULL nếu không phải project chat

    @Column(name = "avatar_url", length = 500, columnDefinition = "NVARCHAR(500)")
    private String avatarUrl;

    @ManyToOne
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // Relationships
    @OneToMany(mappedBy = "chatRoom", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<Message> messages;

    @OneToMany(mappedBy = "chatRoom", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<ChatRoomMember> members;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    // Helper methods
    public boolean isDirectChat() {
        return this.type == RoomType.DIRECT;
    }

    public boolean isGroupChat() {
        return this.type == RoomType.GROUP;
    }

    public boolean isProjectChat() {
        return this.type == RoomType.PROJECT;
    }

    // Enum
    public enum RoomType {
        DIRECT, // Chat 1-1
        GROUP, // Group chat
        PROJECT // Project chat (auto-create khi tạo project)
    }
}