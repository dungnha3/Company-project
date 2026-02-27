package DoAn.BE.project.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import DoAn.BE.chat.entity.ChatRoom;
import DoAn.BE.chat.entity.ChatRoomMember;
import DoAn.BE.chat.repository.ChatRoomMemberRepository;
import DoAn.BE.chat.repository.ChatRoomRepository;
import DoAn.BE.common.exception.DuplicateException;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.common.exception.ProjectAccessDeniedException;
import DoAn.BE.common.service.AccessControlService;
import DoAn.BE.common.service.QuotaService;
import DoAn.BE.hrm.repository.DepartmentRepository;
import DoAn.BE.project.dto.CreateProjectRequest;
import DoAn.BE.project.dto.ProjectDTO;
import DoAn.BE.project.dto.UpdateProjectRequest;
import DoAn.BE.project.entity.Project;
import DoAn.BE.project.entity.ProjectMember;
import DoAn.BE.project.entity.ProjectMember.ProjectRole;
import DoAn.BE.project.repository.IssueRepository;
import DoAn.BE.project.repository.IssueStatusRepository;
import DoAn.BE.project.repository.ProjectMemberRepository;
import DoAn.BE.project.repository.ProjectRepository;
import DoAn.BE.project.repository.SprintRepository;
import DoAn.BE.user.entity.User;

@ExtendWith(MockitoExtension.class)
public class ProjectServiceTest {

    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private ProjectMemberRepository projectMemberRepository;
    @Mock
    private DepartmentRepository departmentRepository;
    @Mock
    private ChatRoomRepository chatRoomRepository;
    @Mock
    private ChatRoomMemberRepository chatRoomMemberRepository;
    @Mock
    private ProjectChatIntegrationService projectChatIntegrationService;
    @Mock
    private DoAn.BE.storage.service.StorageProjectIntegrationService storageProjectIntegrationService;
    @Mock
    private AccessControlService accessControlService;
    @Mock
    private QuotaService quotaService;
    @Mock
    private SprintRepository sprintRepository;
    @Mock
    private IssueRepository issueRepository;
    @Mock
    private IssueStatusRepository issueStatusRepository;
    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private ProjectService projectService;

    private User testUser;
    private Project testProject;
    private ProjectMember testOwnerMember;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setUserId(1L);
        testUser.setUsername("testuser");

        testProject = new Project();
        testProject.setProjectId(100L);
        testProject.setName("Test Project");
        testProject.setKeyProject("TEST");
        testProject.setStatus(Project.ProjectStatus.ACTIVE);

        testOwnerMember = new ProjectMember(testProject, testUser, ProjectRole.OWNER);
    }

    @Test
    void createProject_Success() {
        CreateProjectRequest req = new CreateProjectRequest();
        req.setName("New Project");
        req.setKeyProject("NEW");

        doNothing().when(accessControlService).checkProjectCreatePermission();
        doNothing().when(quotaService).validateProjectQuota();
        when(projectRepository.findByKeyProject("NEW")).thenReturn(Optional.empty());

        when(projectRepository.save(any(Project.class))).thenAnswer(i -> {
            Project p = i.getArgument(0);
            p.setProjectId(200L);
            return p;
        });

        ChatRoom chatRoom = new ChatRoom();
        chatRoom.setRoomId(10L);
        when(chatRoomRepository.save(any(ChatRoom.class))).thenReturn(chatRoom);

        ProjectDTO result = projectService.createProject(req, testUser);

        assertNotNull(result);
        assertEquals("New Project", result.getName());
        verify(projectMemberRepository).save(any(ProjectMember.class));
        verify(chatRoomMemberRepository).save(any(ChatRoomMember.class));
        verify(storageProjectIntegrationService).getOrCreateProjectFolder(any(), eq(testUser));
    }

    @Test
    void createProject_DuplicateKey() {
        CreateProjectRequest req = new CreateProjectRequest();
        req.setKeyProject("TEST");

        when(projectRepository.findByKeyProject("TEST")).thenReturn(Optional.of(testProject));

        assertThrows(DuplicateException.class, () -> projectService.createProject(req, testUser));
    }

    @Test
    void getProjectById_Success() {
        when(accessControlService.canAccessProjects(testUser)).thenReturn(true);
        when(projectRepository.findById(100L)).thenReturn(Optional.of(testProject));
        when(projectMemberRepository.findByProject_ProjectIdAndUser_UserId(100L, 1L))
                .thenReturn(Optional.of(testOwnerMember));

        ProjectDTO result = projectService.getProjectById(100L, testUser);

        assertNotNull(result);
        assertEquals("Test Project", result.getName());
    }

    @Test
    void getProjectById_AccessDenied() {
        when(accessControlService.canAccessProjects(testUser)).thenReturn(false);

        assertThrows(ForbiddenException.class, () -> projectService.getProjectById(100L, testUser));
    }

    @Test
    void getProjectById_NotMember() {
        when(accessControlService.canAccessProjects(testUser)).thenReturn(true);
        when(projectRepository.findById(100L)).thenReturn(Optional.of(testProject));
        when(projectMemberRepository.findByProject_ProjectIdAndUser_UserId(100L, 1L)).thenReturn(Optional.empty());

        assertThrows(ProjectAccessDeniedException.class, () -> projectService.getProjectById(100L, testUser));
    }

    @Test
    void getMyProjects_Success() {
        when(accessControlService.canAccessProjects(testUser)).thenReturn(true);
        when(projectMemberRepository.findByUser_UserId(1L)).thenReturn(List.of(testOwnerMember));

        List<ProjectDTO> result = projectService.getMyProjects(testUser);

        assertEquals(1, result.size());
        assertEquals("Test Project", result.get(0).getName());
    }

    @Test
    void updateProject_Success() {
        UpdateProjectRequest req = new UpdateProjectRequest();
        req.setName("Updated Project");

        when(projectRepository.findById(100L)).thenReturn(Optional.of(testProject));
        when(projectMemberRepository.findByProject_ProjectIdAndUser_UserId(100L, 1L))
                .thenReturn(Optional.of(testOwnerMember));
        when(projectRepository.save(any(Project.class))).thenReturn(testProject);

        ProjectDTO result = projectService.updateProject(100L, req, 1L);
        assertNotNull(result);

        assertEquals("Updated Project", testProject.getName());
        verify(projectRepository).save(testProject);
    }

    @Test
    void updateProject_NotManager() {
        UpdateProjectRequest req = new UpdateProjectRequest();
        ProjectMember guestMember = new ProjectMember(testProject, testUser, ProjectRole.MEMBER);

        when(projectRepository.findById(100L)).thenReturn(Optional.of(testProject));
        when(projectMemberRepository.findByProject_ProjectIdAndUser_UserId(100L, 1L))
                .thenReturn(Optional.of(guestMember));

        assertThrows(ForbiddenException.class, () -> projectService.updateProject(100L, req, 1L));
    }
}
