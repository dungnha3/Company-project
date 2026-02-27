package DoAn.BE.hrm.service;

import DoAn.BE.common.exception.ResourceNotFoundException;
import DoAn.BE.hrm.dto.CreateOnboardingTemplateRequest;
import DoAn.BE.hrm.dto.StartOnboardingRequest;
import DoAn.BE.hrm.dto.UpdateOnboardingProgressRequest;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.hrm.entity.OnboardingInstance;
import DoAn.BE.hrm.entity.OnboardingStep;
import DoAn.BE.hrm.entity.OnboardingTemplate;
import DoAn.BE.hrm.repository.EmployeeRepository;
import DoAn.BE.hrm.repository.OnboardingInstanceRepository;
import DoAn.BE.hrm.repository.OnboardingTemplateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Onboarding Service Unit Tests")
class OnboardingServiceTest {

    @Mock
    private OnboardingTemplateRepository templateRepository;

    @Mock
    private OnboardingInstanceRepository instanceRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @InjectMocks
    private OnboardingService onboardingService;

    private OnboardingTemplate testTemplate;
    private OnboardingInstance testInstance;
    private Employee testEmployee;

    @BeforeEach
    void setUp() {
        testEmployee = new Employee();
        testEmployee.setEmployeeId(1L);
        testEmployee.setFullName("John Doe");

        testTemplate = new OnboardingTemplate();
        testTemplate.setId(10L);
        testTemplate.setName("Standard Developer Onboarding");
        testTemplate.setDescription("Basic onboarding for devs");
        testTemplate.setDuration(14);
        testTemplate.setSteps(new ArrayList<>());

        OnboardingStep step1 = new OnboardingStep();
        step1.setId(101L);
        step1.setTitle("Setup Laptop");
        step1.setTemplate(testTemplate);
        step1.setOrderIndex(1);
        step1.setRequired(true);

        OnboardingStep step2 = new OnboardingStep();
        step2.setId(102L);
        step2.setTitle("Meet the Team");
        step2.setTemplate(testTemplate);
        step2.setOrderIndex(2);
        step2.setRequired(false);

        testTemplate.getSteps().add(step1);
        testTemplate.getSteps().add(step2);

        testInstance = new OnboardingInstance();
        testInstance.setId(100L);
        testInstance.setEmployee(testEmployee);
        testInstance.setTemplate(testTemplate);
        testInstance.setStatus(OnboardingInstance.OnboardingStatus.IN_PROGRESS);
        testInstance.setCurrentStep(1);
        testInstance.setProgress(0);
        testInstance.setStartDate(LocalDate.now());
    }
    // READ OPERATIONS
    @Nested
    @DisplayName("Read Operations")
    class ReadOperationsTests {

        @Test
        @DisplayName("Get all templates returns list")
        void getAllTemplates_returnsList() {
            when(templateRepository.findAll()).thenReturn(List.of(testTemplate));

            List<OnboardingTemplate> result = onboardingService.getAllTemplates();

            assertNotNull(result);
            assertEquals(1, result.size());
            assertEquals(10L, result.get(0).getId());
            verify(templateRepository).findAll();
        }

        @Test
        @DisplayName("Get all active instances returns list")
        void getAllInstances_returnsActiveList() {
            when(instanceRepository.findActiveInstances()).thenReturn(List.of(testInstance));

            List<OnboardingInstance> result = onboardingService.getAllInstances();

            assertNotNull(result);
            assertEquals(1, result.size());
            assertEquals(OnboardingInstance.OnboardingStatus.IN_PROGRESS, result.get(0).getStatus());
            verify(instanceRepository).findActiveInstances();
        }

        @Test
        @DisplayName("Get instance by ID returns instance")
        void getInstanceById_success() {
            when(instanceRepository.findById(100L)).thenReturn(Optional.of(testInstance));

            OnboardingInstance result = onboardingService.getInstanceById(100L);

            assertNotNull(result);
            assertEquals(100L, result.getId());
        }

        @Test
        @DisplayName("Get instance by ID throws ResourceNotFoundException when not found")
        void getInstanceById_notFound_throwsException() {
            when(instanceRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class, () -> onboardingService.getInstanceById(999L));
        }
    }
    // CREATE TEMPLATE TESTS
    @Nested
    @DisplayName("Create Template")
    class CreateTemplateTests {

        @Test
        @DisplayName("Create template with steps successfully")
        void createTemplate_success() {
            CreateOnboardingTemplateRequest request = new CreateOnboardingTemplateRequest();
            request.setName("New Template");
            request.setDescription("A new onboarding template");
            request.setDuration(30);

            CreateOnboardingTemplateRequest.StepRequest step1 = new CreateOnboardingTemplateRequest.StepRequest();
            step1.setTitle("First Step");
            step1.setDescription("Do standard stuff");
            step1.setRequired(true);

            CreateOnboardingTemplateRequest.StepRequest step2 = new CreateOnboardingTemplateRequest.StepRequest();
            step2.setTitle("Second Step");
            step2.setDescription("Optional reading");
            step2.setRequired(false);

            request.setSteps(List.of(step1, step2));

            when(templateRepository.save(any(OnboardingTemplate.class))).thenAnswer(i -> {
                OnboardingTemplate t = i.getArgument(0);
                t.setId(20L);
                return t;
            });

            OnboardingTemplate result = onboardingService.createTemplate(request);

            assertNotNull(result);
            assertEquals(20L, result.getId());
            assertEquals("New Template", result.getName());
            assertEquals(30, result.getDuration());

            ArgumentCaptor<OnboardingTemplate> templateCaptor = ArgumentCaptor.forClass(OnboardingTemplate.class);
            verify(templateRepository).save(templateCaptor.capture());

            OnboardingTemplate savedTemplate = templateCaptor.getValue();
            assertNotNull(savedTemplate.getSteps());
            assertEquals(2, savedTemplate.getSteps().size());

            OnboardingStep savedStep1 = savedTemplate.getSteps().get(0);
            assertEquals("First Step", savedStep1.getTitle());
            assertEquals(1, savedStep1.getOrderIndex());
            assertTrue(savedStep1.getRequired());

            OnboardingStep savedStep2 = savedTemplate.getSteps().get(1);
            assertEquals("Second Step", savedStep2.getTitle());
            assertEquals(2, savedStep2.getOrderIndex());
            assertFalse(savedStep2.getRequired());
        }

        @Test
        @DisplayName("Create template without steps or duration successfully")
        void createTemplate_noStepsOrDuration_success() {
            CreateOnboardingTemplateRequest request = new CreateOnboardingTemplateRequest();
            request.setName("Basic Template");
            request.setDescription("Just the name");

            when(templateRepository.save(any(OnboardingTemplate.class))).thenAnswer(i -> {
                OnboardingTemplate t = i.getArgument(0);
                t.setId(21L);
                return t;
            });

            OnboardingTemplate result = onboardingService.createTemplate(request);

            assertNotNull(result);
            assertEquals(21L, result.getId());
            assertEquals("Basic Template", result.getName());

            ArgumentCaptor<OnboardingTemplate> templateCaptor = ArgumentCaptor.forClass(OnboardingTemplate.class);
            verify(templateRepository).save(templateCaptor.capture());

            OnboardingTemplate savedTemplate = templateCaptor.getValue();
            assertEquals(0, savedTemplate.getSteps().size());
        }
    }
    // START ONBOARDING TESTS
    @Nested
    @DisplayName("Start Onboarding")
    class StartOnboardingTests {

        @Test
        @DisplayName("Start onboarding instance successfully")
        void startOnboarding_success() {
            StartOnboardingRequest request = new StartOnboardingRequest();
            request.setEmployeeId(1L);
            request.setTemplateId(10L);

            when(employeeRepository.findById(1L)).thenReturn(Optional.of(testEmployee));
            when(templateRepository.findById(10L)).thenReturn(Optional.of(testTemplate));
            when(instanceRepository.save(any(OnboardingInstance.class))).thenAnswer(i -> i.getArgument(0));

            OnboardingInstance result = onboardingService.startOnboarding(request);

            assertNotNull(result);
            assertEquals(testEmployee, result.getEmployee());
            assertEquals(testTemplate, result.getTemplate());
            assertEquals(1, result.getCurrentStep());
            assertEquals(0, result.getProgress());
            assertEquals(OnboardingInstance.OnboardingStatus.IN_PROGRESS, result.getStatus());
            assertEquals(LocalDate.now(), result.getStartDate());

            verify(instanceRepository).save(any(OnboardingInstance.class));
        }

        @Test
        @DisplayName("Start onboarding with invalid employee throws exception")
        void startOnboarding_invalidEmployee_throwsException() {
            StartOnboardingRequest request = new StartOnboardingRequest();
            request.setEmployeeId(999L);
            request.setTemplateId(10L);

            when(employeeRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class, () -> onboardingService.startOnboarding(request));
            verify(instanceRepository, never()).save(any());
        }

        @Test
        @DisplayName("Start onboarding with invalid template throws exception")
        void startOnboarding_invalidTemplate_throwsException() {
            StartOnboardingRequest request = new StartOnboardingRequest();
            request.setEmployeeId(1L);
            request.setTemplateId(999L);

            when(employeeRepository.findById(1L)).thenReturn(Optional.of(testEmployee));
            when(templateRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class, () -> onboardingService.startOnboarding(request));
            verify(instanceRepository, never()).save(any());
        }
    }
    // UPDATE PROGRESS TESTS
    @Nested
    @DisplayName("Update Progress")
    class UpdateProgressTests {

        @Test
        @DisplayName("Update current step only")
        void updateProgress_currentStep_success() {
            UpdateOnboardingProgressRequest request = new UpdateOnboardingProgressRequest();
            request.setCurrentStep(2);

            when(instanceRepository.findById(100L)).thenReturn(Optional.of(testInstance));
            when(instanceRepository.save(any(OnboardingInstance.class))).thenAnswer(i -> i.getArgument(0));

            OnboardingInstance result = onboardingService.updateProgress(100L, request);

            assertNotNull(result);
            assertEquals(2, result.getCurrentStep());
            assertEquals(OnboardingInstance.OnboardingStatus.IN_PROGRESS, result.getStatus());
            verify(instanceRepository).save(result);
        }

        @Test
        @DisplayName("Update status manually")
        void updateProgress_status_success() {
            UpdateOnboardingProgressRequest request = new UpdateOnboardingProgressRequest();
            request.setStatus(OnboardingInstance.OnboardingStatus.CANCELLED);

            when(instanceRepository.findById(100L)).thenReturn(Optional.of(testInstance));
            when(instanceRepository.save(any(OnboardingInstance.class))).thenAnswer(i -> i.getArgument(0));

            OnboardingInstance result = onboardingService.updateProgress(100L, request);

            assertNotNull(result);
            assertEquals(1, result.getCurrentStep());
            assertEquals(OnboardingInstance.OnboardingStatus.CANCELLED, result.getStatus());
            verify(instanceRepository).save(result);
        }

        @Test
        @DisplayName("Completing all steps auto-completes the instance")
        void updateProgress_allStepsDone_autoCompletes() {
            UpdateOnboardingProgressRequest request = new UpdateOnboardingProgressRequest();
            request.setCurrentStep(3);

            when(instanceRepository.findById(100L)).thenReturn(Optional.of(testInstance));
            when(instanceRepository.save(any(OnboardingInstance.class))).thenAnswer(i -> i.getArgument(0));

            OnboardingInstance result = onboardingService.updateProgress(100L, request);

            assertNotNull(result);
            assertEquals(3, result.getCurrentStep());
            assertEquals(OnboardingInstance.OnboardingStatus.COMPLETED, result.getStatus());
            assertEquals(100, result.getProgress());
            verify(instanceRepository).save(result);
        }

        @Test
        @DisplayName("Update with empty request saves instance unchanged")
        void updateProgress_emptyRequest_savesUnchanged() {
            UpdateOnboardingProgressRequest request = new UpdateOnboardingProgressRequest();

            when(instanceRepository.findById(100L)).thenReturn(Optional.of(testInstance));
            when(instanceRepository.save(any(OnboardingInstance.class))).thenAnswer(i -> i.getArgument(0));

            OnboardingInstance result = onboardingService.updateProgress(100L, request);

            assertNotNull(result);
            assertEquals(1, result.getCurrentStep());
            assertEquals(0, result.getProgress());
            assertEquals(OnboardingInstance.OnboardingStatus.IN_PROGRESS, result.getStatus());
            verify(instanceRepository).save(result);
        }

        @Test
        @DisplayName("Update non-existent instance throws Exception")
        void updateProgress_invalidInstance_throwsException() {
            UpdateOnboardingProgressRequest request = new UpdateOnboardingProgressRequest();
            request.setCurrentStep(2);

            when(instanceRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class, () -> onboardingService.updateProgress(999L, request));
            verify(instanceRepository, never()).save(any());
        }
    }
}
