---
name: spring-boot-best-practices
description: Enterprise-grade Spring Boot optimization guidelines. Use when writing, reviewing, or refactoring Spring Boot applications to ensure optimal performance, security, and maintainability. Triggers on tasks involving JPA/Hibernate, REST APIs, security, caching, transactions, async processing, or microservices patterns.
license: MIT
metadata:
  author: enterprise
  version: "1.0.0"
---

# Spring Boot Best Practices

Comprehensive performance and architecture optimization guide for Spring Boot applications, designed for AI agents and LLMs. Contains 50+ rules across 8 categories, prioritized by impact from critical (JPA optimization, API design) to incremental (monitoring patterns). Each rule includes detailed explanations, real-world examples comparing incorrect vs. correct implementations.

## When to Apply

Reference these guidelines when:
- Writing new Spring Boot controllers, services, or repositories
- Implementing JPA/Hibernate data access
- Designing REST APIs with proper error handling
- Configuring security with JWT or OAuth2
- Setting up caching strategies
- Managing transactions and async operations
- Optimizing for production deployment

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | JPA/Hibernate Optimization | CRITICAL | `jpa-` |
| 2 | REST API Design | CRITICAL | `rest-` |
| 3 | Security Best Practices | HIGH | `security-` |
| 4 | Caching Strategies | HIGH | `cache-` |
| 5 | Transaction Management | MEDIUM-HIGH | `tx-` |
| 6 | Async & Concurrency | MEDIUM | `async-` |
| 7 | Configuration & Resilience | MEDIUM | `config-` |
| 8 | Monitoring & Observability | LOW-MEDIUM | `monitor-` |

## Quick Reference

### 1. JPA/Hibernate Optimization (CRITICAL)

- `jpa-n-plus-one` - Use JOIN FETCH to avoid N+1 query problem
- `jpa-entity-graph` - Use @EntityGraph for controlled eager fetching
- `jpa-batch-fetch` - Configure @BatchSize for batch loading
- `jpa-projections` - Use DTO projections for read-only queries
- `jpa-lazy-loading` - Prefer LAZY over EAGER for ToMany relations
- `jpa-pagination` - Always paginate large result sets
- `jpa-native-query` - Use native queries for complex operations
- `jpa-connection-pool` - Configure HikariCP connection pool properly

### 2. REST API Design (CRITICAL)

- `rest-global-exception` - Use @RestControllerAdvice for centralized error handling
- `rest-problem-details` - Return RFC 7807 Problem Details for errors
- `rest-pagination` - Standardize pagination response format with metadata
- `rest-versioning` - Implement API versioning (URI, header, or media type)
- `rest-dto-pattern` - Use DTOs instead of exposing entities
- `rest-validation` - Validate all input with Bean Validation annotations
- `rest-hateoas` - Add HATEOAS links for API discoverability
- `rest-http-status` - Return appropriate HTTP status codes

### 3. Security Best Practices (HIGH)

- `security-jwt-stateless` - Configure stateless JWT authentication
- `security-bcrypt` - Hash passwords with BCrypt (strength ≥ 10)
- `security-method-security` - Use @PreAuthorize for method-level security
- `security-cors` - Configure CORS with explicit allowed origins
- `security-csrf` - Handle CSRF appropriately for stateful sessions
- `security-secrets` - Externalize secrets with environment variables
- `security-short-lived-tokens` - Use short-lived access + refresh tokens

### 4. Caching Strategies (HIGH)

- `cache-caffeine` - Use Caffeine for local in-memory caching
- `cache-redis` - Configure Redis for distributed caching
- `cache-conditional` - Use @Cacheable with condition and unless
- `cache-eviction` - Implement proper cache eviction strategies
- `cache-cache-aside` - Prefer Cache-Aside pattern for data consistency

### 5. Transaction Management (MEDIUM-HIGH)

- `tx-readonly` - Use @Transactional(readOnly=true) for read operations
- `tx-propagation` - Choose correct transaction propagation level
- `tx-isolation` - Configure isolation levels for concurrency
- `tx-rollback` - Define rollbackFor for checked exceptions
- `tx-service-layer` - Apply transactions at service layer, not controller

### 6. Async & Concurrency (MEDIUM)

- `async-enable` - Configure @EnableAsync with proper executor
- `async-executor` - Use custom TaskExecutor with bounded queue
- `async-completable-future` - Return CompletableFuture for composition
- `async-virtual-threads` - Use Virtual Threads in Java 21+
- `async-events` - Use ApplicationEventPublisher for decoupling
- `async-scheduled` - Configure @Scheduled with proper error handling

### 7. Configuration & Resilience (MEDIUM)

- `config-profiles` - Use Spring Profiles for environment separation
- `config-externalize` - Externalize all configuration properly
- `config-circuit-breaker` - Implement circuit breakers with Resilience4j
- `config-retry` - Add retry logic with exponential backoff
- `config-graceful-shutdown` - Enable graceful shutdown for containers
- `config-health-checks` - Configure custom health indicators

### 8. Monitoring & Observability (LOW-MEDIUM)

- `monitor-actuator` - Enable and secure Actuator endpoints
- `monitor-micrometer` - Configure Micrometer for metrics collection
- `monitor-structured-logging` - Use structured JSON logging
- `monitor-trace-id` - Add trace ID for request correlation
- `monitor-slow-queries` - Log slow queries and performance metrics

## How to Use

Read individual rule files for detailed explanations and code examples:

```
rules/jpa-n-plus-one.md
rules/rest-global-exception.md
```

Each rule file contains:
- Brief explanation of why it matters
- Incorrect code example with explanation
- Correct code example with explanation
- Additional context and references

### Rule: quality-no-javadoc
- **ID**: quality-no-javadoc
- **Severity**: warning
- **Description**: Do NOT use Javadoc (`/** */`) for internal code. Use single-line comments (`//`) instead. Javadoc is only appropriate for public library APIs. For internal services, controllers, repositories, and DTOs, always prefer `//` comments.

### Rule: test-no-conditional-skip
- **ID**: test-no-conditional-skip
- **Severity**: error
- **Description**: NEVER wrap test assertions inside `if (status == 200) { ... }` or `if (id != null) { ... }`. This pattern causes tests to **silently pass without testing anything** when setup fails. Instead, use `assertTrue(status == 200 || status == 201, "Setup failed: " + status)` and `assertNotNull(id, "Failed to extract ID")` so failures are loud and visible.

### Rule: test-no-weak-assertions
- **ID**: test-no-weak-assertions
- **Severity**: error
- **Description**: Do NOT use weak assertions like `assertNotEquals(500, status)` or `assertTrue(status != 500)`. Assert the **specific expected status code**: `assertEquals(200, status)` or `assertTrue(status == 200 || status == 204, "msg")`. Weak assertions hide real bugs by passing on unexpected status codes like 403, 404, or 302.

### Rule: test-no-java-assert
- **ID**: test-no-java-assert
- **Severity**: error
- **Description**: NEVER use Java `assert` keyword in tests. Java `assert` can be disabled by JVM flags (`-da`) causing all assertions to silently pass. Always use JUnit `assertEquals()`, `assertTrue()`, `assertNotNull()`, `assertThrows()` from `org.junit.jupiter.api.Assertions.*`.

### Rule: test-correct-endpoint
- **ID**: test-correct-endpoint
- **Severity**: error
- **Description**: Integration tests MUST call endpoints that actually exist in the controller. Do NOT test made-up URLs (e.g., `/api/timelogs?userId=X` when the controller only has `/api/timelogs/my`). Verify the endpoint exists in the `@RequestMapping` before writing the test.

### Rule: test-complete-dto
- **ID**: test-complete-dto
- **Severity**: error
- **Description**: When testing POST/PUT endpoints with `@Valid @RequestBody`, the test JSON MUST include ALL `@NotNull`/`@NotBlank` fields from the DTO. Missing required fields → 400 validation error → test silently skips if wrapped in conditional. Always check the DTO class for required fields before writing test payloads.

### Rule: arch-no-god-class
- **ID**: arch-no-god-class
- **Severity**: warning
- **Description**: Service classes should not exceed ~300 LOC. When a class grows beyond this, extract cohesive groups of methods into focused services. Examples: `DashboardService` (505 LOC) → `HRDashboardService` + `FinancialDashboardService`; `AIActionExecutor` (852 LOC) → `ProjectActionHandler` + `IssueActionHandler` + `SprintActionHandler`.

### Rule: arch-no-security-util-in-controller
- **ID**: arch-no-security-util-in-controller
- **Severity**: error
- **Description**: Controllers MUST use `@AuthenticationPrincipal User currentUser` parameter instead of `SecurityUtil.getCurrentUser()`. `SecurityUtil` depends on `SecurityContextHolder` which may not be populated in all contexts (e.g., tests, async calls). `@AuthenticationPrincipal` is injected by Spring and is always reliable.

### Rule: arch-cache-evict-on-write
- **ID**: arch-cache-evict-on-write
- **Severity**: error
- **Description**: Any method that modifies a `@Cacheable` entity MUST have `@CacheEvict` on the same cache key. Without eviction, stale cached data persists indefinitely. Example: `getSettingsCached()` uses `@Cacheable("companySettings")`, so `updateSettings()`, `changePlan()`, `updateCompanyFeatures()` must all use `@CacheEvict(value = "companySettings", key = "#companyId")`.

## Full Compiled Document

For the complete guide with all rules expanded: `AGENTS.md`
