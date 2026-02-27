package DoAn.BE.common.controller;

import DoAn.BE.common.search.SearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// Controller for unified search across entities
// /
@RestController
@RequestMapping("/api/search")
@Tag(name = "Search", description = "Unified search across issues, projects, employees")
@ConditionalOnBean(SearchService.class)
public class SearchController {

    private final SearchService searchService;

    @Autowired
    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping
    @Operation(summary = "Search", description = "Search across multiple entity types")
    public ResponseEntity<SearchService.SearchResult> search(
            @RequestParam String q,
            @RequestParam(required = false) List<String> types,
            @RequestParam(defaultValue = "20") int limit) {

        if (q == null || q.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        SearchService.SearchResult result = searchService.search(q.trim(), types, limit);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/issues")
    @Operation(summary = "Search issues only")
    public ResponseEntity<?> searchIssues(
            @RequestParam String q,
            @RequestParam(defaultValue = "20") int limit) {

        return ResponseEntity.ok(searchService.search(q, List.of("issue"), limit).getIssues());
    }

    @GetMapping("/projects")
    @Operation(summary = "Search projects only")
    public ResponseEntity<?> searchProjects(
            @RequestParam String q,
            @RequestParam(defaultValue = "20") int limit) {

        return ResponseEntity.ok(searchService.search(q, List.of("project"), limit).getProjects());
    }

    @GetMapping("/employees")
    @Operation(summary = "Search employees only")
    public ResponseEntity<?> searchEmployees(
            @RequestParam String q,
            @RequestParam(defaultValue = "20") int limit) {

        return ResponseEntity.ok(searchService.search(q, List.of("employee"), limit).getEmployees());
    }
}
