package DoAn.BE.project.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import DoAn.BE.common.exception.BadRequestException;
import DoAn.BE.common.exception.ForbiddenException;
import DoAn.BE.project.dto.CreateIssueRequest;
import DoAn.BE.project.dto.IssueDTO;
import DoAn.BE.project.entity.Issue;
import DoAn.BE.project.entity.IssueActivity;
import DoAn.BE.project.entity.IssueStatus;
import DoAn.BE.project.entity.Project;
import DoAn.BE.project.entity.ProjectMember;
import DoAn.BE.project.entity.ProjectMember.ProjectRole;
import DoAn.BE.project.entity.Sprint;
import DoAn.BE.project.repository.IssueActivityRepository;
import DoAn.BE.project.repository.IssueRepository;
import DoAn.BE.project.repository.IssueStatusRepository;
import DoAn.BE.project.repository.ProjectMemberRepository;
import DoAn.BE.project.repository.ProjectRepository;
import DoAn.BE.project.repository.SprintRepository;
import DoAn.BE.user.entity.User;
import DoAn.BE.user.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
public class IssueServiceTest {

    @Mock
    private IssueRepository issueRepository;
    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private ProjectMemberRepository projectMemberRepository;
    @Mock
    private IssueStatusRepository issueStatusRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private SprintRepository sprintRepository;
    @Mock
    private IssueActivityRepository issueActivityRepository;
    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private IssueService issueService;

    private User testUser;
    private Project testProject;
    private ProjectMember testMember;
    private IssueStatus todoStatus;
    private Issue testIssue;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setUserId(1L);
        testUser.setUsername("testuser");

        testProject = new Project();
        testProject.setProjectId(100L);
        testProject.setKeyProject("TEST");
        testProject.setName("Test Project");

        testMember = new ProjectMember(testProject, testUser, ProjectRole.MEMBER);

        todoStatus = new IssueStatus();
        todoStatus.setStatusId(1);
        todoStatus.setName("To Do");

        testIssue = new Issue();
        testIssue.setIssueId(500L);
        testIssue.setIssueKey("TEST-1");
        testIssue.setTitle("Fix Bug");
        testIssue.setProject(testProject);
        testIssue.setReporter(testUser);
        testIssue.setIssueStatus(todoStatus);
    }

    @Test
    void createIssue_Success() {
        CreateIssueRequest req = new CreateIssueRequest();
        req.setProjectId(100L);
        req.setTitle("New Task");

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(projectRepository.findById(100L)).thenReturn(Optional.of(testProject));
        when(projectMemberRepository.findByProject_ProjectIdAndUser_UserId(100L, 1L))
                .thenReturn(Optional.of(testMember));
        when(issueStatusRepository.findById(1)).thenReturn(Optional.of(todoStatus));
        when(issueRepository.countByProject_ProjectId(100L)).thenReturn(0L);

        when(issueRepository.save(any(Issue.class))).thenAnswer(i -> {
            Issue issue = i.getArgument(0);
            issue.setIssueId(200L);
            return issue;
        });

        IssueDTO result = issueService.createIssue(req, 1L);

        assertNotNull(result);
        assertEquals("New Task", result.getTitle());
        assertEquals("TEST-1", result.getIssueKey());
        verify(issueRepository).save(any(Issue.class));
    }

    @Test
    void createIssue_InCompletedSprint_ThrowsBadRequest() {
        CreateIssueRequest req = new CreateIssueRequest();
        req.setProjectId(100L);
        req.setTitle("Task in Zombie Sprint");
        req.setSprintId(99L);

        Sprint completedSprint = new Sprint();
        completedSprint.setSprintId(99L);
        completedSprint.setProject(testProject);
        completedSprint.setStatus(Sprint.SprintStatus.COMPLETED);

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(projectRepository.findById(100L)).thenReturn(Optional.of(testProject));
        when(projectMemberRepository.findByProject_ProjectIdAndUser_UserId(100L, 1L))
                .thenReturn(Optional.of(testMember));
        when(issueStatusRepository.findById(1)).thenReturn(Optional.of(todoStatus));
        when(sprintRepository.findById(99L)).thenReturn(Optional.of(completedSprint));

        assertThrows(BadRequestException.class, () -> issueService.createIssue(req, 1L));
    }

    @Test
    void changeIssueStatus_Success_WithActivityLog() {
        IssueStatus doneStatus = new IssueStatus();
        doneStatus.setStatusId(3);
        doneStatus.setName("Done");

        when(issueRepository.findById(500L)).thenReturn(Optional.of(testIssue));
        when(projectMemberRepository.findByProject_ProjectIdAndUser_UserId(100L, 1L))
                .thenReturn(Optional.of(testMember));
        when(issueStatusRepository.findById(3)).thenReturn(Optional.of(doneStatus));
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(issueRepository.save(any(Issue.class))).thenReturn(testIssue);

        IssueDTO result = issueService.changeIssueStatus(500L, 3, 1L);
        assertNotNull(result);

        assertEquals("Done", testIssue.getIssueStatus().getName());
        verify(issueActivityRepository).save(any(IssueActivity.class));
        verify(issueRepository).save(testIssue);
    }

    @Test
    void deleteIssue_NotManagerOrReporter_ThrowsForbidden() {
        User anotherUser = new User();
        anotherUser.setUserId(2L);

        ProjectMember guestMember = new ProjectMember(testProject, anotherUser, ProjectRole.MEMBER);

        when(issueRepository.findById(500L)).thenReturn(Optional.of(testIssue)); // Reporter is testUser (1L)
        when(projectMemberRepository.findByProject_ProjectIdAndUser_UserId(100L, 2L))
                .thenReturn(Optional.of(guestMember));

        assertThrows(ForbiddenException.class, () -> issueService.deleteIssue(500L, 2L));
    }

    @Test
    void deleteIssue_SuccessAsReporter() {
        when(issueRepository.findById(500L)).thenReturn(Optional.of(testIssue)); // Reporter is testUser (1L)
        when(projectMemberRepository.findByProject_ProjectIdAndUser_UserId(100L, 1L))
                .thenReturn(Optional.of(testMember));

        issueService.deleteIssue(500L, 1L);

        verify(issueRepository).delete(testIssue);
    }
}
