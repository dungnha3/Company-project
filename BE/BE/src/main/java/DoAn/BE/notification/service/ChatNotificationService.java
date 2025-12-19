package DoAn.BE.notification.service;

import DoAn.BE.notification.entity.Notification;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// Service quản lý thông báo chat
@Service
@Transactional
@RequiredArgsConstructor
public class ChatNotificationService {

    private final NotificationService notificationService;
    
    /**
     * Tạo chat notification với type động
     */
    public Notification createChatNotification(Long userId, String type, String title, String content, String link) {
        return notificationService.createNotification(userId, "CHAT_" + type, title, content, link);
    }

    /**
     * Tạo notification cho tin nhắn mới
     */
    public Notification createNewMessageNotification(Long userId, String senderName, String content, Long roomId) {
        String title = "Tin nhắn mới từ " + senderName;
        String truncatedContent = content != null && content.length() > 50 ? 
            content.substring(0, 47) + "..." : content;
        String link = "/chat/rooms/" + roomId;
        
        return createChatNotification(userId, "NEW_MESSAGE", title, truncatedContent, link);
    }

    /**
     * Tạo notification cho thành viên mới
     */
    public Notification createMemberJoinedNotification(Long userId, String memberName, Long roomId) {
        String title = "Thành viên mới";
        String content = memberName + " đã tham gia phòng chat";
        String link = "/chat/rooms/" + roomId;
        
        return createChatNotification(userId, "MEMBER_JOINED", title, content, link);
    }

    /**
     * Tạo notification cho thành viên rời khỏi
     */
    public Notification createMemberLeftNotification(Long userId, String memberName, Long roomId) {
        String title = "Thành viên rời khỏi";
        String content = memberName + " đã rời khỏi phòng chat";
        String link = "/chat/rooms/" + roomId;
        
        return createChatNotification(userId, "MEMBER_LEFT", title, content, link);
    }

    /**
     * Tạo notification cho phòng chat được cập nhật
     */
    public Notification createRoomUpdatedNotification(Long userId, String updateType, String details, Long roomId) {
        String title = "Phòng chat được cập nhật";
        String content = "Phòng chat đã được cập nhật: " + details;
        String link = "/chat/rooms/" + roomId;
        
        return createChatNotification(userId, "ROOM_UPDATED", title, content, link);
    }

    /**
     * Tạo notification khi được thêm vào phòng chat
     */
    public Notification createAddedToRoomNotification(Long userId, String roomName, String addedBy, Long roomId) {
        String title = "Bạn được thêm vào phòng chat";
        String content = addedBy + " đã thêm bạn vào phòng \"" + roomName + "\"";
        String link = "/chat/rooms/" + roomId;
        
        return createChatNotification(userId, "ADDED_TO_ROOM", title, content, link);
    }

    /**
     * Tạo notification khi được reply tin nhắn
     */
    public Notification createMessageRepliedNotification(Long userId, String replierName, String replyContent, Long roomId) {
        String title = replierName + " đã trả lời tin nhắn của bạn";
        String truncatedContent = replyContent != null && replyContent.length() > 50 ? 
            replyContent.substring(0, 47) + "..." : replyContent;
        String link = "/chat/rooms/" + roomId;
        
        return createChatNotification(userId, "MESSAGE_REPLIED", title, truncatedContent, link);
    }

    /**
     * Tạo notification khi role thay đổi
     */
    public Notification createRoleChangedNotification(Long userId, String newRole, String changedBy, Long roomId, String roomName) {
        String title = "Quyền của bạn đã thay đổi";
        String content = changedBy + " đã thay đổi quyền của bạn thành " + newRole + " trong phòng \"" + roomName + "\"";
        String link = "/chat/rooms/" + roomId;
        
        return createChatNotification(userId, "ROLE_CHANGED", title, content, link);
    }
}
