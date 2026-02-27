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
@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectChatIntegrationService {

    private final ChatRoomRepository chatRoomRepository;
    private final MessageRepository messageRepository;
    @Transactional
    public void postSystemMessage(Project project, String messageContent) {
        if (project == null || messageContent == null || messageContent.isBlank()) {
            log.warn("Project hoặc message không được null/empty");
            return;
        }

        try {
            List<ChatRoom> projectChats = chatRoomRepository.findByProject(project);
            if (projectChats.isEmpty()) {
                log.warn("Project {} không có chat room", project.getProjectId());
                return;
            }

            ChatRoom chatRoom = projectChats.get(0);
            Message systemMessage = new Message();
            systemMessage.setChatRoom(chatRoom);
            systemMessage.setSender(null);
            systemMessage.setContent("🤖 " + messageContent);
            systemMessage.setMessageType(Message.MessageType.SYSTEM);
            systemMessage.setCreatedAt(LocalDateTime.now());
            systemMessage.setIsDeleted(false);

            messageRepository.save(systemMessage);
            log.info("Đã gửi system message đến project chat {}: {}", chatRoom.getRoomId(), messageContent);

        } catch (Exception e) {
            log.error("Lỗi gửi system message đến project chat: {}", e.getMessage(), e);
        }
    }
    public void notifyProjectStatusChanged(Project project, String oldStatus, String newStatus) {
        String message = String.format("📊 Trạng thái dự án đã thay đổi: %s → %s", oldStatus, newStatus);
        postSystemMessage(project, message);
    }
    public void notifyProjectDeadlineChanged(Project project, String oldDeadline, String newDeadline) {
        String message = String.format("📅 Deadline dự án đã thay đổi: %s → %s", oldDeadline, newDeadline);
        postSystemMessage(project, message);
    }
    public void notifyMemberAdded(Project project, String memberName, String role) {
        String message = String.format("👤 %s đã được thêm vào dự án với vai trò %s", memberName, role);
        postSystemMessage(project, message);
    }
    public void notifyMemberRemoved(Project project, String memberName) {
        String message = String.format("👋 %s đã rời khỏi dự án", memberName);
        postSystemMessage(project, message);
    }
    public void notifyProjectCompleted(Project project) {
        String message = "🎉 Chúc mừng! Dự án đã hoàn thành!";
        postSystemMessage(project, message);
    }
}
