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

## Full Compiled Document

For the complete guide with all rules expanded: `AGENTS.md`
