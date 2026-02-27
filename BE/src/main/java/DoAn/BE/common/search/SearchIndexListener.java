package DoAn.BE.common.search;

import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.project.entity.Issue;
import DoAn.BE.project.entity.Project;
import jakarta.persistence.PostPersist;
import jakarta.persistence.PostRemove;
import jakarta.persistence.PostUpdate;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

// JPA Entity Listener for automatic Elasticsearch indexing
// Triggers indexing on entity create/update/delete
// /
@Component
@Slf4j
@ConditionalOnProperty(name = "spring.elasticsearch.enabled", havingValue = "true", matchIfMissing = false)
public class SearchIndexListener {

    private static SearchService searchService;

    @Autowired
    public void setSearchService(SearchService service) {
        SearchIndexListener.searchService = service;
    }

    @PostPersist
    @PostUpdate
    @Async
    public void indexIssue(Issue issue) {
        if (searchService != null && issue != null) {
            try {
                searchService.indexIssue(issue);
                log.debug("Indexed issue: {}", issue.getIssueKey());
            } catch (Exception e) {
                log.error("Failed to index issue: {}", e.getMessage());
            }
        }
    }

    @PostRemove
    @Async
    public void removeIssue(Issue issue) {
        if (searchService != null && issue != null) {
            try {
                searchService.removeIssue(issue.getIssueId());
                log.debug("Removed issue from index: {}", issue.getIssueId());
            } catch (Exception e) {
                log.error("Failed to remove issue from index: {}", e.getMessage());
            }
        }
    }

    @PostPersist
    @PostUpdate
    @Async
    public void indexProject(Project project) {
        if (searchService != null && project != null) {
            try {
                searchService.indexProject(project);
                log.debug("Indexed project: {}", project.getKeyProject());
            } catch (Exception e) {
                log.error("Failed to index project: {}", e.getMessage());
            }
        }
    }

    @PostPersist
    @PostUpdate
    @Async
    public void indexEmployee(Employee employee) {
        if (searchService != null && employee != null) {
            try {
                searchService.indexEmployee(employee);
                log.debug("Indexed employee: {}", employee.getFullName());
            } catch (Exception e) {
                log.error("Failed to index employee: {}", e.getMessage());
            }
        }
    }
}
