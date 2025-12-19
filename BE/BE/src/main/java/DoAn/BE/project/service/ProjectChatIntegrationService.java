package DoAn.BE.project.service;

import DoAn.BE.chat.entity.ChatRoom;
import DoAn.BE.chat.entity.Message;
import DoAn.BE.chat.repository.ChatRoomRepository;
import DoAn.BE.chat.repository.MessageRepository;
import DoAn.BE.project.entity.Project;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Service để tích hợp Project events với Chat
 * Auto post system messages vào project chat khi có updates
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectChatIntegrationService {
    
    private final ChatRoomRepository chatRoomRepository;
    private final MessageRepository messageRepository;
    
    /**
     * Post system message vào project chat
     */
    @Transactional
    public void postSystemMessage(Project project, String message) {
        try {
            List<ChatRoom> projectChats = chatRoomRepository.findByProject(project);
            if (projectChats.isEmpty()) {
                log.warn("Project {} không có chat room", project.getProjectId());
                return;
            }
            
            ChatRoom chatRoom = projectChats.get(0);
            
            // TEMPORARY FIX: Skip system messages until database is updated
            log.info("SKIPPED system message to project chat {}: {}", chatRoom.getRoomId(), message);
            return;
            
            /* TODO: Enable after running fix_message_sender_null.sql
            Message systemMessage = new Message();
            systemMessage.setChatRoom(chatRoom);
            systemMessage.setSender(null); // System message không có sender
            systemMessage.setContent("🤖 " + message); // Prefix with bot emoji for system messages
            systemMessage.setMessageType(Message.MessageType.TEXT);
            systemMessage.setSentAt(LocalDateTime.now());
            systemMessage.setIsDeleted(false);
            
            messageRepository.save(systemMessage);
            log.info("Posted system message to project chat {}: {}", chatRoom.getRoomId(), message);
            */
            
        } catch (Exception e) {
            log.error("Error posting system message to project chat: {}", e.getMessage(), e);
        }
    }
    
    /**
     * Notification khi project status thay đổi
     */
    public void notifyProjectStatusChanged(Project project, String oldStatus, String newStatus) {
        String message = String.format("📊 Trạng thái dự án đã thay đổi: %s → %s", oldStatus, newStatus);
        postSystemMessage(project, message);
    }
    
    /**
     * Notification khi project deadline thay đổi
     */
    public void notifyProjectDeadlineChanged(Project project, String oldDeadline, String newDeadline) {
        String message = String.format("📅 Deadline dự án đã thay đổi: %s → %s", oldDeadline, newDeadline);
        postSystemMessage(project, message);
    }
    
    /**
     * Notification khi có member mới
     */
    public void notifyMemberAdded(Project project, String memberName, String role) {
        String message = String.format("👤 %s đã được thêm vào dự án với vai trò %s", memberName, role);
        postSystemMessage(project, message);
    }
    
    /**
     * Notification khi member rời đi
     */
    public void notifyMemberRemoved(Project project, String memberName) {
        String message = String.format("👋 %s đã rời khỏi dự án", memberName);
        postSystemMessage(project, message);
    }
    
    /**
     * Notification khi project completed
     */
    public void notifyProjectCompleted(Project project) {
        String message = "🎉 Chúc mừng! Dự án đã hoàn thành!";
        postSystemMessage(project, message);
    }
}
