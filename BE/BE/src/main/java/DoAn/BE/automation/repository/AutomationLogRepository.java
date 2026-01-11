package DoAn.BE.automation.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import DoAn.BE.automation.entity.AutomationLog;

@Repository
public interface AutomationLogRepository extends JpaRepository<AutomationLog, Long> {

    Page<AutomationLog> findByRule_RuleIdOrderByExecutedAtDesc(Long ruleId, Pageable pageable);

    List<AutomationLog> findByIssue_IssueIdOrderByExecutedAtDesc(Long issueId);

    Page<AutomationLog> findByRule_Project_ProjectIdOrderByExecutedAtDesc(Long projectId, Pageable pageable);
}
