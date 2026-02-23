package DoAn.BE.hrm.repository;

import DoAn.BE.hrm.entity.OnboardingTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OnboardingTemplateRepository extends JpaRepository<OnboardingTemplate, Long> {
}
