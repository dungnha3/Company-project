package DoAn.BE.common.search;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@ConditionalOnProperty(name = "spring.elasticsearch.enabled", havingValue = "true", matchIfMissing = false)
public interface IssueSearchRepository extends ElasticsearchRepository<IssueDocument, String> {

    List<IssueDocument> findByCompanyIdAndTitleContainingOrDescriptionContaining(
            Long companyId, String title, String description);

    List<IssueDocument> findByCompanyIdAndProjectId(Long companyId, Long projectId);

    List<IssueDocument> findByCompanyIdAndAssigneeId(Long companyId, Long assigneeId);

    void deleteByIssueId(Long issueId);
}
