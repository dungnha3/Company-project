package DoAn.BE.smart.service;

import DoAn.BE.smart.dto.SmartSubtaskDTO;
import DoAn.BE.smart.dto.SmartSubtaskDTO.SubtaskSuggestion;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Smart Subtask Generator — Rule-based Keyword Matching algorithm.
 *
 * Algorithm:
 *   1. Concatenate title + description, convert to lowercase, tokenize by whitespace.
 *   2. Scan each token against a pre-built subtaskDictionary (Map<keyword, List<SubtaskTemplate>>).
 *   3. Collect matched subtasks into a LinkedHashSet to preserve insertion order and remove duplicates.
 *   4. Calculate relevanceScore = (matchedKeywords / totalKeywordsInDictionary) × 100 per category.
 *
 * Caching:
 *   Uses Spring @Cacheable with in-memory ConcurrentMapCacheManager.
 *   Cache key = hash of (title + description) to avoid re-computation.
 *
 * Dictionary covers 6 categories:
 *   - Backend (api, database, schema, rest, endpoint, service, repository, jpa, hibernate, spring)
 *   - Frontend (ui, frontend, giao diện, component, react, css, html, responsive, layout, form)
 *   - DevOps (deploy, server, aws, docker, ci/cd, pipeline, kubernetes, nginx, ssl, domain)
 *   - Testing (test, testing, unit test, automation, qa, kiểm thử, selenium, jest, coverage)
 *   - Auth (login, auth, đăng nhập, phân quyền, oauth, jwt, token, bảo mật, security, password)
 *   - Reporting (report, báo cáo, thống kê, dashboard, chart, biểu đồ, export, excel, pdf, analytics)
 */
@Slf4j
@Service
public class SmartSubtaskService {

    /**
     * Each template holds a subtask title and its category.
     */
    private record SubtaskTemplate(String title, String category) {}

    /**
     * Dictionary: keyword → list of subtask templates.
     * Initialized once at construction time.
     */
    private final Map<String, List<SubtaskTemplate>> subtaskDictionary;

    public SmartSubtaskService() {
        this.subtaskDictionary = buildDictionary();
    }

    /**
     * Generate subtask suggestions from issue title and description.
     * Results are cached by the hash of (title + description).
     *
     * @param title       issue title (required)
     * @param description issue description (optional)
     * @return SmartSubtaskDTO with suggestions, matched keywords, and method
     */
    @Cacheable(value = "smartSubtasks", key = "T(java.util.Objects).hash(#title, #description)")
    public SmartSubtaskDTO generateSubtasks(String title, String description) {
        if (title == null || title.isBlank()) {
            return SmartSubtaskDTO.empty();
        }

        // 1. Concatenate and normalize
        String rawText = title + (description != null ? " " + description : "");
        String normalized = rawText.toLowerCase().trim();

        // 2. Tokenize — split on whitespace and common punctuation
        String[] tokens = normalized.split("[\\s,;.!?()\\[\\]{}|/\\\\]+");

        // 3. Scan tokens against dictionary
        Set<String> matchedKeywords = new LinkedHashSet<>();
        // Use LinkedHashSet of title to deduplicate while preserving order
        Map<String, SubtaskSuggestion> uniqueSuggestions = new LinkedHashMap<>();
        // Track matched categories for scoring
        Map<String, Integer> categoryMatchCount = new HashMap<>();

        for (String token : tokens) {
            if (token.length() < 2) continue;

            // Check exact match
            if (subtaskDictionary.containsKey(token)) {
                matchedKeywords.add(token);
                for (SubtaskTemplate tmpl : subtaskDictionary.get(token)) {
                    categoryMatchCount.merge(tmpl.category, 1, Integer::sum);
                    uniqueSuggestions.putIfAbsent(tmpl.title, SubtaskSuggestion.builder()
                            .title(tmpl.title)
                            .category(tmpl.category)
                            .relevanceScore(0) // will calculate later
                            .build());
                }
            }

            // Check if token is part of a multi-word keyword (bigram matching)
            for (int i = 0; i < tokens.length - 1; i++) {
                String bigram = tokens[i] + " " + tokens[i + 1];
                if (subtaskDictionary.containsKey(bigram)) {
                    matchedKeywords.add(bigram);
                    for (SubtaskTemplate tmpl : subtaskDictionary.get(bigram)) {
                        categoryMatchCount.merge(tmpl.category, 1, Integer::sum);
                        uniqueSuggestions.putIfAbsent(tmpl.title, SubtaskSuggestion.builder()
                                .title(tmpl.title)
                                .category(tmpl.category)
                                .relevanceScore(0)
                                .build());
                    }
                }
            }
        }

        if (uniqueSuggestions.isEmpty()) {
            return SmartSubtaskDTO.empty();
        }

        // 4. Calculate relevance scores per suggestion based on category match density
        int maxCategoryHits = categoryMatchCount.values().stream().mapToInt(Integer::intValue).max().orElse(1);
        List<SubtaskSuggestion> finalSuggestions = new ArrayList<>();
        for (SubtaskSuggestion suggestion : uniqueSuggestions.values()) {
            int catHits = categoryMatchCount.getOrDefault(suggestion.getCategory(), 0);
            int relevance = Math.min(100, (int) Math.round((double) catHits / maxCategoryHits * 100));
            finalSuggestions.add(SubtaskSuggestion.builder()
                    .title(suggestion.getTitle())
                    .category(suggestion.getCategory())
                    .relevanceScore(relevance)
                    .build());
        }

        // Sort by relevance descending
        finalSuggestions.sort((a, b) -> b.getRelevanceScore() - a.getRelevanceScore());

        log.info("Smart Subtask: matched {} keywords → {} unique suggestions for title='{}'",
                matchedKeywords.size(), finalSuggestions.size(), title);

        return SmartSubtaskDTO.builder()
                .suggestions(finalSuggestions)
                .totalMatched(matchedKeywords.size())
                .matchedKeywords(new ArrayList<>(matchedKeywords))
                .method("rule-based")
                .build();
    }

    // ── Dictionary Builder ──────────────────────────────────────────────────────

    private Map<String, List<SubtaskTemplate>> buildDictionary() {
        Map<String, List<SubtaskTemplate>> dict = new HashMap<>();

        // ── BACKEND ──
        List<SubtaskTemplate> backendTasks = List.of(
                new SubtaskTemplate("Thiết kế schema database", "backend"),
                new SubtaskTemplate("Viết RESTful API endpoints", "backend"),
                new SubtaskTemplate("Cấu hình phân quyền API", "backend"),
                new SubtaskTemplate("Viết Unit Test cho service layer", "backend"),
                new SubtaskTemplate("Viết validation cho request DTO", "backend"),
                new SubtaskTemplate("Tạo migration/seed data", "backend")
        );
        for (String kw : List.of("api", "backend", "database", "schema", "rest", "endpoint",
                "service", "repository", "jpa", "hibernate", "spring", "entity",
                "cơ sở dữ liệu", "máy chủ", "controller", "crud")) {
            dict.put(kw, backendTasks);
        }

        // ── FRONTEND ──
        List<SubtaskTemplate> frontendTasks = List.of(
                new SubtaskTemplate("Thiết kế mockup/wireframe UI", "frontend"),
                new SubtaskTemplate("Cắt giao diện HTML/CSS", "frontend"),
                new SubtaskTemplate("Xây dựng component React", "frontend"),
                new SubtaskTemplate("Ghép API vào frontend", "frontend"),
                new SubtaskTemplate("Xử lý responsive cho mobile/tablet", "frontend"),
                new SubtaskTemplate("Xử lý form validation phía client", "frontend")
        );
        for (String kw : List.of("ui", "frontend", "giao diện", "component", "react", "css",
                "html", "responsive", "layout", "form", "trang", "màn hình",
                "thiết kế", "giao dien", "web", "jsx", "tailwind")) {
            dict.put(kw, frontendTasks);
        }

        // ── DEVOPS ──
        List<SubtaskTemplate> devopsTasks = List.of(
                new SubtaskTemplate("Tạo Dockerfile", "devops"),
                new SubtaskTemplate("Cấu hình CI/CD pipeline", "devops"),
                new SubtaskTemplate("Deploy lên server/cloud", "devops"),
                new SubtaskTemplate("Cấu hình domain & SSL", "devops"),
                new SubtaskTemplate("Thiết lập monitoring & logging", "devops"),
                new SubtaskTemplate("Viết tài liệu deploy/runbook", "devops")
        );
        for (String kw : List.of("deploy", "server", "aws", "docker", "ci/cd", "pipeline",
                "kubernetes", "nginx", "ssl", "domain", "cloud", "triển khai",
                "vps", "hosting", "devops", "infrastructure", "k8s")) {
            dict.put(kw, devopsTasks);
        }

        // ── TESTING ──
        List<SubtaskTemplate> testingTasks = List.of(
                new SubtaskTemplate("Viết test plan / test cases", "testing"),
                new SubtaskTemplate("Viết Unit Test", "testing"),
                new SubtaskTemplate("Viết Integration Test", "testing"),
                new SubtaskTemplate("Thực hiện kiểm thử thủ công (manual testing)", "testing"),
                new SubtaskTemplate("Kiểm thử hiệu năng (performance testing)", "testing"),
                new SubtaskTemplate("Tổng hợp báo cáo kiểm thử", "testing")
        );
        for (String kw : List.of("test", "testing", "unit test", "automation", "qa",
                "kiểm thử", "selenium", "jest", "coverage", "kiem thu",
                "integration test", "e2e", "bug", "regression")) {
            dict.put(kw, testingTasks);
        }

        // ── AUTH ──
        List<SubtaskTemplate> authTasks = List.of(
                new SubtaskTemplate("Thiết kế flow đăng nhập/đăng ký", "auth"),
                new SubtaskTemplate("Implement API xác thực (JWT/OAuth)", "auth"),
                new SubtaskTemplate("Xây dựng UI đăng nhập/đăng ký", "auth"),
                new SubtaskTemplate("Cấu hình phân quyền theo role", "auth"),
                new SubtaskTemplate("Viết test cho authentication", "auth"),
                new SubtaskTemplate("Xử lý reset/forgot password", "auth")
        );
        for (String kw : List.of("login", "auth", "đăng nhập", "phân quyền", "oauth",
                "jwt", "token", "bảo mật", "security", "password",
                "đăng ký", "dang nhap", "xác thực", "authentication",
                "authorization", "register", "signup")) {
            dict.put(kw, authTasks);
        }

        // ── REPORTING ──
        List<SubtaskTemplate> reportingTasks = List.of(
                new SubtaskTemplate("Thiết kế layout báo cáo/dashboard", "reporting"),
                new SubtaskTemplate("Xây dựng API thống kê dữ liệu", "reporting"),
                new SubtaskTemplate("Tạo biểu đồ (chart) trực quan", "reporting"),
                new SubtaskTemplate("Implement chức năng export Excel/PDF", "reporting"),
                new SubtaskTemplate("Tối ưu query thống kê (indexing)", "reporting"),
                new SubtaskTemplate("Viết test cho module báo cáo", "reporting")
        );
        for (String kw : List.of("report", "báo cáo", "thống kê", "dashboard", "chart",
                "biểu đồ", "export", "excel", "pdf", "analytics",
                "bao cao", "thong ke", "bieu do", "thống kê", "kpi")) {
            dict.put(kw, reportingTasks);
        }

        return Collections.unmodifiableMap(dict);
    }
}
