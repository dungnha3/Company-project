package DoAn.BE.project.listener;

import DoAn.BE.notification.service.EmailNotificationService;
import DoAn.BE.project.dto.ProjectMemberDTO;
import DoAn.BE.project.event.ProjectEvent;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;

@Component
@RequiredArgsConstructor
@Slf4j
public class ProjectNotificationListener {

    private final EmailNotificationService emailNotificationService;
    private final UserRepository userRepository;

    @Async
    @EventListener
    public void handleProjectEvent(ProjectEvent event) {
        if (event.getType() == ProjectEvent.Type.MEMBER_ADDED) {
            ProjectMemberDTO newMember = (ProjectMemberDTO) event.getPayload();
            if (newMember != null && newMember.getEmail() != null) {
                // Ánh xạ vai trò
                String roleName = "Thành viên";
                if (newMember.getRole() != null) {
                    switch (newMember.getRole()) {
                        case OWNER -> roleName = "Chủ dự án";
                        case MANAGER -> roleName = "Quản lý";
                        case MEMBER -> roleName = "Thành viên";
                    }
                }

                // Định dạng ngày bắt đầu
                String startDateStr = "Chưa xác định";
                if (event.getProject().getStartDate() != null) {
                    startDateStr = event.getProject().getStartDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
                }

                // Lấy tên người thực hiện
                String actorName = "Hệ thống";
                if (event.getActorId() != null) {
                    actorName = userRepository.findById(event.getActorId())
                            .map(User::getFullName)
                            .orElse("Hệ thống");
                }

                emailNotificationService.sendProjectMemberAddedEmail(
                        newMember.getEmail(),
                        newMember.getFullName() != null && !newMember.getFullName().isBlank() ? newMember.getFullName() : newMember.getUsername(),
                        event.getProject().getKeyProject() != null ? event.getProject().getKeyProject() : "PROJECT",
                        event.getProject().getName(),
                        event.getProject().getProjectId(),
                        roleName,
                        startDateStr,
                        actorName
                );
            }
        }
    }
}
