package DoAn.BE.hrm.service;

import DoAn.BE.hrm.dto.CreateOnboardingTemplateRequest;
import DoAn.BE.hrm.dto.StartOnboardingRequest;
import DoAn.BE.hrm.dto.UpdateOnboardingProgressRequest;
import DoAn.BE.hrm.entity.*;
import DoAn.BE.hrm.repository.*;
import DoAn.BE.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OnboardingService {

    private final OnboardingTemplateRepository templateRepository;
    private final OnboardingInstanceRepository instanceRepository;
    private final EmployeeRepository employeeRepository;

    public List<OnboardingTemplate> getAllTemplates() {
        return templateRepository.findAll();
    }

    public List<OnboardingInstance> getAllInstances() {
        return instanceRepository.findActiveInstances();
    }

    public OnboardingInstance getInstanceById(Long id) {
        return instanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Onboarding instance not found"));
    }

    @Transactional
    public OnboardingTemplate createTemplate(CreateOnboardingTemplateRequest request) {
        OnboardingTemplate template = new OnboardingTemplate();
        template.setName(request.getName());
        template.setDescription(request.getDescription());

        if (request.getDuration() != null) {
            template.setDuration(request.getDuration());
        }

        // Add steps if provided
        if (request.getSteps() != null) {
            int order = 1;
            for (CreateOnboardingTemplateRequest.StepRequest stepData : request.getSteps()) {
                OnboardingStep step = new OnboardingStep();
                step.setTitle(stepData.getTitle());
                step.setDescription(stepData.getDescription());
                step.setOrderIndex(order++);
                step.setRequired(stepData.getRequired() != null ? stepData.getRequired() : true);
                template.addStep(step);
            }
        }

        return templateRepository.save(template);
    }

    @Transactional
    public OnboardingInstance startOnboarding(StartOnboardingRequest request) {
        Employee employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

        OnboardingTemplate template = templateRepository.findById(request.getTemplateId())
                .orElseThrow(() -> new ResourceNotFoundException("Template not found"));

        OnboardingInstance instance = new OnboardingInstance();
        instance.setEmployee(employee);
        instance.setTemplate(template);
        instance.setStartDate(LocalDate.now());
        instance.setCurrentStep(1);
        instance.setProgress(0);
        instance.setStatus(OnboardingInstance.OnboardingStatus.IN_PROGRESS);

        return instanceRepository.save(instance);
    }

    @Transactional
    public OnboardingInstance updateProgress(Long instanceId, UpdateOnboardingProgressRequest request) {
        OnboardingInstance instance = getInstanceById(instanceId);

        if (request.getCurrentStep() != null) {
            instance.setCurrentStep(request.getCurrentStep());
            instance.updateProgress();
        }

        if (request.getStatus() != null) {
            instance.setStatus(request.getStatus());
        }

        // Auto-complete if all steps done
        if (instance.getTemplate() != null &&
                instance.getCurrentStep() > instance.getTemplate().getSteps().size()) {
            instance.setStatus(OnboardingInstance.OnboardingStatus.COMPLETED);
            instance.setProgress(100);
        }

        return instanceRepository.save(instance);
    }
}
