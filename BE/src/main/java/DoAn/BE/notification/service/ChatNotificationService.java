package DoAn.BE.notification.service;

import DoAn.BE.notification.entity.Notification;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// [Service thông báo chat] (Role: System)
@Service
@Transactional
@RequiredArgsConstructor
public class ChatNotificationService {

        private final NotificationService notificationService;

        // [Thông báo tin nhắn mới] (Role: System)
        public Notification createNewMessageNotification(Long userId, String senderName, String content, Long roomId) {
                String truncatedContent = content != null && content.length() > 50
                                ? content.substring(0, 47) + "..."
                                : content;
                return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.CHAT_MESSAGE,
                                "/chat/rooms/" + roomId, senderName, truncatedContent);
        }

        // [Thông báo thành viên mới tham gia] (Role: System)
        public Notification createMemberJoinedNotification(Long userId, String memberName, Long roomId) {
                return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.CHAT_ROOM,
                                "/chat/rooms/" + roomId, memberName);
        }

        // [Thông báo thành viên rời khỏi] (Role: System)

        // [Thông báo phòng chat được cập nhật] (Role: System)
        public Notification createRoomUpdatedNotification(Long userId, String updateType, String details, Long roomId) {
                return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.CHAT_ROOM,
                                "/chat/rooms/" + roomId, details);
        }

        // [Thông báo được thêm vào phòng chat] (Role: System)
        public Notification createAddedToRoomNotification(Long userId, String roomName, String addedBy, Long roomId) {
                return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.CHAT_ROOM,
                                "/chat/rooms/" + roomId, addedBy, roomName);
        }

        // [Thông báo được reply tin nhắn] (Role: System)
        public Notification createMessageRepliedNotification(Long userId, String replierName, String replyContent,
                        Long roomId) {
                String truncatedContent = replyContent != null && replyContent.length() > 50
                                ? replyContent.substring(0, 47) + "..."
                                : replyContent;
                return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.CHAT_MESSAGE,
                                "/chat/rooms/" + roomId, replierName, truncatedContent);
        }

        // [Thông báo role thay đổi] (Role: System)
        public Notification createRoleChangedNotification(Long userId, String newRole, String changedBy, Long roomId,
                        String roomName) {
                return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.CHAT_ROOM,
                                "/chat/rooms/" + roomId, changedBy, newRole, roomName);
        }

        // [Thông báo mention] (Role: System)
        public Notification createMentionNotification(Long userId, String senderName, String content, Long roomId) {
                String truncatedContent = content != null && content.length() > 50
                                ? content.substring(0, 47) + "..."
                                : content;
                return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.CHAT_MENTION,
                                "/chat/rooms/" + roomId, senderName, truncatedContent);
        }

        // [Thông báo task mention] (Role: System)
        public Notification createTaskMentionNotification(Long userId, String senderName, String taskName,
                        String taskUrl) {
                return notificationService.send(userId, DoAn.BE.notification.entity.NotificationType.CHAT_TASK_MENTION,
                                taskUrl, senderName, taskName);
        }

        // [Thông báo tin nhắn bị sửa] (Role: System)

        // [Thông báo tin nhắn bị xóa] (Role: System)
}
