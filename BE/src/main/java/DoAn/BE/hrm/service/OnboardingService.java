package DoAn.BE.hrm.service;

import DoAn.BE.hrm.entity.*;
import DoAn.BE.hrm.repository.*;
import DoAn.BE.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

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
    public OnboardingTemplate createTemplate(Map<String, Object> request) {
        OnboardingTemplate template = new OnboardingTemplate();
        template.setName((String) request.get("name"));
        template.setDescription((String) request.get("description"));

        if (request.containsKey("duration")) {
            template.setDuration(((Number) request.get("duration")).intValue());
        }

        // Add steps if provided
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> stepsData = (List<Map<String, Object>>) request.get("steps");
        if (stepsData != null) {
            int order = 1;
            for (Map<String, Object> stepData : stepsData) {
                OnboardingStep step = new OnboardingStep();
                step.setTitle((String) stepData.get("title"));
                step.setDescription((String) stepData.get("description"));
                step.setOrderIndex(order++);
                step.setRequired(stepData.get("required") != null ? (Boolean) stepData.get("required") : true);
                template.addStep(step);
            }
        }

        return templateRepository.save(template);
    }

    @Transactional
    public OnboardingInstance startOnboarding(Map<String, Object> request) {
        Long employeeId = ((Number) request.get("employeeId")).longValue();
        Long templateId = ((Number) request.get("templateId")).longValue();

        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

        OnboardingTemplate template = templateRepository.findById(templateId)
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
    public OnboardingInstance updateProgress(Long instanceId, Map<String, Object> request) {
        OnboardingInstance instance = getInstanceById(instanceId);

        if (request.containsKey("currentStep")) {
            instance.setCurrentStep(((Number) request.get("currentStep")).intValue());
            instance.updateProgress();
        }

        if (request.containsKey("status")) {
            instance.setStatus(OnboardingInstance.OnboardingStatus.valueOf((String) request.get("status")));
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
