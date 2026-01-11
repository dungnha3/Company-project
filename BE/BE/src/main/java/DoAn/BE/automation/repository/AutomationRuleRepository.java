package DoAn.BE.automation.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import DoAn.BE.automation.entity.AutomationRule;
import DoAn.BE.automation.entity.AutomationRule.TriggerType;

@Repository
public interface AutomationRuleRepository extends JpaRepository<AutomationRule, Long> {

    List<AutomationRule> findByProject_ProjectIdAndIsActiveTrue(Long projectId);

    List<AutomationRule> findByProject_ProjectId(Long projectId);

    List<AutomationRule> findByProject_ProjectIdAndTriggerTypeAndIsActiveTrue(
            Long projectId, TriggerType triggerType);

    List<AutomationRule> findByCompany_CompanyIdAndIsActiveTrue(Long companyId);

    long countByProject_ProjectId(Long projectId);
}
