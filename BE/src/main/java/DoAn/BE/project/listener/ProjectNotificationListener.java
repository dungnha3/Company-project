package DoAn.BE.project.listener;

import DoAn.BE.notification.service.EmailNotificationService;
import DoAn.BE.project.dto.ProjectMemberDTO;
import DoAn.BE.project.event.ProjectEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ProjectNotificationListener {

    private final EmailNotificationService emailNotificationService;

    @Async
    @EventListener
    public void handleProjectEvent(ProjectEvent event) {
        if (event.getType() == ProjectEvent.Type.MEMBER_ADDED) {
            ProjectMemberDTO newMember = (ProjectMemberDTO) event.getPayload();
            if (newMember != null && newMember.getEmail() != null) {
                emailNotificationService.sendProjectMemberAddedEmail(
                        newMember.getEmail(),
                        newMember.getFullName() != null ? newMember.getFullName() : newMember.getUsername(),
                        event.getProject().getName(),
                        event.getProject().getProjectId()
                );
            }
        }
    }
}
