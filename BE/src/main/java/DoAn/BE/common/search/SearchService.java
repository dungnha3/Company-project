package DoAn.BE.common.search;

import DoAn.BE.common.context.TenantContext;
import DoAn.BE.hrm.entity.Employee;
import DoAn.BE.project.entity.Issue;
import DoAn.BE.project.entity.Project;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.data.elasticsearch.core.query.Criteria;
import org.springframework.data.elasticsearch.core.query.CriteriaQuery;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

// Service for unified search across multiple entity types using Elasticsearch
// /
@Service
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "spring.elasticsearch.enabled", havingValue = "true", matchIfMissing = false)
public class SearchService {

    private final ElasticsearchOperations elasticsearchOperations;
    private final IssueSearchRepository issueSearchRepository;

    // Unified search across all entity types
    // /
    public SearchResult search(String query, List<String> types, int limit) {
        Long companyId = TenantContext.getCompanyId();
        if (companyId == null) {
            return SearchResult.empty();
        }

        SearchResult result = new SearchResult();
        result.setQuery(query);

        // Search each requested type
        if (types == null || types.isEmpty() || types.contains("issue")) {
            result.setIssues(searchIssues(query, companyId, limit));
        }
        if (types == null || types.isEmpty() || types.contains("project")) {
            result.setProjects(searchProjects(query, companyId, limit));
        }
        if (types == null || types.isEmpty() || types.contains("employee")) {
            result.setEmployees(searchEmployees(query, companyId, limit));
        }

        return result;
    }

    // Search issues
    // /
    public List<IssueDocument> searchIssues(String query, Long companyId, int limit) {
        try {
            Criteria criteria = new Criteria("companyId").is(companyId)
                    .and(new Criteria("title").contains(query)
                            .or("description").contains(query)
                            .or("issueKey").is(query));

            CriteriaQuery searchQuery = new CriteriaQuery(criteria);
            searchQuery.setMaxResults(limit);

            SearchHits<IssueDocument> hits = elasticsearchOperations.search(searchQuery, IssueDocument.class);
            return hits.stream()
                    .map(SearchHit::getContent)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Issue search failed: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    // Search projects
    // /
    public List<ProjectDocument> searchProjects(String query, Long companyId, int limit) {
        try {
            Criteria criteria = new Criteria("companyId").is(companyId)
                    .and(new Criteria("name").contains(query)
                            .or("description").contains(query)
                            .or("projectKey").is(query));

            CriteriaQuery searchQuery = new CriteriaQuery(criteria);
            searchQuery.setMaxResults(limit);

            SearchHits<ProjectDocument> hits = elasticsearchOperations.search(searchQuery, ProjectDocument.class);
            return hits.stream()
                    .map(SearchHit::getContent)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Project search failed: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    // Search employees
    // /
    public List<EmployeeDocument> searchEmployees(String query, Long companyId, int limit) {
        try {
            Criteria criteria = new Criteria("companyId").is(companyId)
                    .and(new Criteria("fullName").contains(query)
                            .or("email").is(query)
                            .or("departmentName").contains(query));

            CriteriaQuery searchQuery = new CriteriaQuery(criteria);
            searchQuery.setMaxResults(limit);

            SearchHits<EmployeeDocument> hits = elasticsearchOperations.search(searchQuery, EmployeeDocument.class);
            return hits.stream()
                    .map(SearchHit::getContent)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Employee search failed: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    // Index an issue
    // /
    public void indexIssue(Issue issue) {
        try {
            Long companyId = issue.getProject().getCompany() != null
                    ? issue.getProject().getCompany().getCompanyId()
                    : null;

            IssueDocument doc = IssueDocument.builder()
                    .id(issue.getIssueId().toString())
                    .issueId(issue.getIssueId())
                    .companyId(companyId)
                    .projectId(issue.getProject().getProjectId())
                    .issueKey(issue.getIssueKey())
                    .title(issue.getTitle())
                    .description(issue.getDescription())
                    .status(issue.getIssueStatus() != null ? issue.getIssueStatus().getName() : null)
                    .priority(issue.getPriority() != null ? issue.getPriority().name() : null)
                    .assigneeName(issue.getAssignee() != null ? issue.getAssignee().getUsername() : null)
                    .assigneeId(issue.getAssignee() != null ? issue.getAssignee().getUserId() : null)
                    .reporterName(issue.getReporter() != null ? issue.getReporter().getUsername() : null)
                    .projectName(issue.getProject().getName())
                    .createdAt(issue.getCreatedAt())
                    .updatedAt(issue.getUpdatedAt())
                    .build();

            issueSearchRepository.save(doc);
            log.debug("Indexed issue: {}", issue.getIssueKey());
        } catch (Exception e) {
            log.error("Failed to index issue {}: {}", issue.getIssueId(), e.getMessage());
        }
    }

    // Index a project
    // /
    public void indexProject(Project project) {
        try {
            Long companyId = project.getCompany() != null
                    ? project.getCompany().getCompanyId()
                    : null;

            ProjectDocument doc = ProjectDocument.builder()
                    .id(project.getProjectId().toString())
                    .projectId(project.getProjectId())
                    .companyId(companyId)
                    .projectKey(project.getKeyProject())
                    .name(project.getName())
                    .description(project.getDescription())
                    .status(project.getStatus() != null ? project.getStatus().name() : null)
                    .methodology(null) // No methodology field in Project
                    .managerName(project.getCreatedBy() != null ? project.getCreatedBy().getUsername() : null)
                    .managerId(project.getCreatedBy() != null ? project.getCreatedBy().getUserId() : null)
                    .build();

            elasticsearchOperations.save(doc);
            log.debug("Indexed project: {}", project.getKeyProject());
        } catch (Exception e) {
            log.error("Failed to index project {}: {}", project.getProjectId(), e.getMessage());
        }
    }

    // Index an employee
    // /
    public void indexEmployee(Employee employee) {
        try {
            Long companyId = employee.getCompany() != null
                    ? employee.getCompany().getCompanyId()
                    : null;

            EmployeeDocument doc = EmployeeDocument.builder()
                    .id(employee.getEmployeeId().toString())
                    .employeeId(employee.getEmployeeId())
                    .companyId(companyId)
                    .fullName(employee.getFullName())
                    .email(employee.getUser() != null ? employee.getUser().getEmail() : null)
                    .departmentName(employee.getDepartment() != null ? employee.getDepartment().getName() : null)
                    .departmentId(employee.getDepartment() != null ? employee.getDepartment().getDepartmentId() : null)
                    .positionName(employee.getPosition() != null ? employee.getPosition().getName() : null)
                    .positionId(employee.getPosition() != null ? employee.getPosition().getPositionId() : null)
                    .status(employee.getStatus() != null ? employee.getStatus().name() : null)
                    .build();

            elasticsearchOperations.save(doc);
            log.debug("Indexed employee: {}", employee.getFullName());
        } catch (Exception e) {
            log.error("Failed to index employee {}: {}", employee.getEmployeeId(), e.getMessage());
        }
    }

    // Remove issue from index
    // /
    public void removeIssue(Long issueId) {
        try {
            issueSearchRepository.deleteByIssueId(issueId);
        } catch (Exception e) {
            log.error("Failed to remove issue from index: {}", e.getMessage());
        }
    }

    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class SearchResult {
        private String query;
        private List<IssueDocument> issues = new ArrayList<>();
        private List<ProjectDocument> projects = new ArrayList<>();
        private List<EmployeeDocument> employees = new ArrayList<>();

        public static SearchResult empty() {
            return new SearchResult();
        }

        public int getTotalCount() {
            return issues.size() + projects.size() + employees.size();
        }
    }
}
