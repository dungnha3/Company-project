# Spring Boot Best Practices

**Version 1.0.0**  
Enterprise Engineering  
February 2026

> **Note:**  
> This document is mainly for agents and LLMs to follow when maintaining,  
> generating, or refactoring Spring Boot codebases. Humans may also find it  
> useful, but guidance here is optimized for automation and consistency.

---

## Abstract

Comprehensive performance and architecture optimization guide for Spring Boot applications. Contains 50+ rules across 8 categories, prioritized by impact from critical (JPA optimization, API design) to incremental (monitoring patterns). Each rule includes detailed explanations, real-world examples.

---

## Table of Contents

1. [JPA/Hibernate Optimization](#1-jpahibernate-optimization) — **CRITICAL**
   - 1.1 [Avoid N+1 Query Problem](#11-avoid-n1-query-problem)
   - 1.2 [Use @EntityGraph for Controlled Fetching](#12-use-entitygraph-for-controlled-fetching)
   - 1.3 [Configure Batch Fetching](#13-configure-batch-fetching)
   - 1.4 [Use DTO Projections](#14-use-dto-projections)
   - 1.5 [Prefer LAZY Loading](#15-prefer-lazy-loading)
   - 1.6 [Always Paginate Large Results](#16-always-paginate-large-results)
   - 1.7 [Use Native Queries When Appropriate](#17-use-native-queries-when-appropriate)
   - 1.8 [Configure HikariCP Connection Pool](#18-configure-hikaricp-connection-pool)
2. [REST API Design](#2-rest-api-design) — **CRITICAL**
   - 2.1 [Global Exception Handling](#21-global-exception-handling)
   - 2.2 [Return RFC 7807 Problem Details](#22-return-rfc-7807-problem-details)
   - 2.3 [Standardize Pagination Response](#23-standardize-pagination-response)
   - 2.4 [Implement API Versioning](#24-implement-api-versioning)
   - 2.5 [Use DTOs Instead of Entities](#25-use-dtos-instead-of-entities)
   - 2.6 [Validate All Input](#26-validate-all-input)
   - 2.7 [Return Appropriate HTTP Status Codes](#27-return-appropriate-http-status-codes)
3. [Security Best Practices](#3-security-best-practices) — **HIGH**
   - 3.1 [Configure Stateless JWT Authentication](#31-configure-stateless-jwt-authentication)
   - 3.2 [Hash Passwords with BCrypt](#32-hash-passwords-with-bcrypt)
   - 3.3 [Use Method-Level Security](#33-use-method-level-security)
   - 3.4 [Configure CORS Properly](#34-configure-cors-properly)
   - 3.5 [Externalize Secrets](#35-externalize-secrets)
   - 3.6 [Use Short-Lived Tokens](#36-use-short-lived-tokens)
4. [Caching Strategies](#4-caching-strategies) — **HIGH**
   - 4.1 [Use Caffeine for Local Caching](#41-use-caffeine-for-local-caching)
   - 4.2 [Configure Redis for Distributed Caching](#42-configure-redis-for-distributed-caching)
   - 4.3 [Cache with Conditions](#43-cache-with-conditions)
   - 4.4 [Implement Cache Eviction](#44-implement-cache-eviction)
5. [Transaction Management](#5-transaction-management) — **MEDIUM-HIGH**
   - 5.1 [Use readOnly for Read Operations](#51-use-readonly-for-read-operations)
   - 5.2 [Choose Correct Propagation](#52-choose-correct-propagation)
   - 5.3 [Define rollbackFor](#53-define-rollbackfor)
   - 5.4 [Apply at Service Layer](#54-apply-at-service-layer)
6. [Async & Concurrency](#6-async--concurrency) — **MEDIUM**
   - 6.1 [Configure Custom TaskExecutor](#61-configure-custom-taskexecutor)
   - 6.2 [Use Virtual Threads](#62-use-virtual-threads)
   - 6.3 [Use ApplicationEventPublisher](#63-use-applicationeventpublisher)
7. [Configuration & Resilience](#7-configuration--resilience) — **MEDIUM**
   - 7.1 [Use Spring Profiles](#71-use-spring-profiles)
   - 7.2 [Implement Circuit Breakers](#72-implement-circuit-breakers)
   - 7.3 [Add Retry with Backoff](#73-add-retry-with-backoff)
   - 7.4 [Enable Graceful Shutdown](#74-enable-graceful-shutdown)
8. [Monitoring & Observability](#8-monitoring--observability) — **LOW-MEDIUM**
   - 8.1 [Enable Actuator Endpoints](#81-enable-actuator-endpoints)
   - 8.2 [Use Structured Logging](#82-use-structured-logging)
   - 8.3 [Add Trace ID Correlation](#83-add-trace-id-correlation)

---

## 1. JPA/Hibernate Optimization

**Impact: CRITICAL**

JPA/Hibernate issues are the #1 performance killer in Spring Boot apps. N+1 queries, inefficient fetching, and poor connection management cause most database bottlenecks.

### 1.1 Avoid N+1 Query Problem

**Impact: CRITICAL (can cause 100x slower queries)**

The N+1 problem occurs when fetching a list of entities triggers N additional queries to load related entities. Use `JOIN FETCH` to load everything in one query.

**Incorrect: N+1 queries**

```java
// Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByCustomerId(Long customerId);
}

// Service - triggers N+1
public List<OrderDTO> getCustomerOrders(Long customerId) {
    List<Order> orders = orderRepository.findByCustomerId(customerId);
    return orders.stream()
        .map(order -> new OrderDTO(
            order.getId(),
            order.getItems().size()  // Each access triggers a query!
        ))
        .toList();
}
// If customer has 100 orders: 1 query for orders + 100 queries for items = 101 queries
```

**Correct: Single query with JOIN FETCH**

```java
// Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    @Query("SELECT o FROM Order o JOIN FETCH o.items WHERE o.customer.id = :customerId")
    List<Order> findByCustomerIdWithItems(@Param("customerId") Long customerId);
}

// Service - single query
public List<OrderDTO> getCustomerOrders(Long customerId) {
    List<Order> orders = orderRepository.findByCustomerIdWithItems(customerId);
    return orders.stream()
        .map(order -> new OrderDTO(order.getId(), order.getItems().size()))
        .toList();
}
// Always 1 query regardless of order count
```

### 1.2 Use @EntityGraph for Controlled Fetching

**Impact: HIGH (declarative eager fetching without JPQL)**

`@EntityGraph` provides a cleaner alternative to `JOIN FETCH` that works with Spring Data query methods.

**Usage:**

```java
public interface UserRepository extends JpaRepository<User, Long> {
    
    // Fetch user with roles in single query
    @EntityGraph(attributePaths = {"roles"})
    Optional<User> findWithRolesById(Long id);
    
    // Fetch user with roles and permissions
    @EntityGraph(attributePaths = {"roles", "roles.permissions"})
    Optional<User> findWithRolesAndPermissionsById(Long id);
    
    // Named entity graph defined on entity
    @EntityGraph(value = "User.withDepartment")
    List<User> findByDepartmentId(Long departmentId);
}

// Entity with named graph
@Entity
@NamedEntityGraph(
    name = "User.withDepartment",
    attributeNodes = @NamedAttributeNode("department")
)
public class User {
    @ManyToOne(fetch = FetchType.LAZY)
    private Department department;
}
```

### 1.3 Configure Batch Fetching

**Impact: HIGH (reduces N+1 to N/batchSize + 1)**

When you can't use `JOIN FETCH` (e.g., pagination), use `@BatchSize` to batch lazy loads.

**Configuration:**

```java
// Entity-level batch size
@Entity
public class Order {
    @OneToMany(mappedBy = "order", fetch = FetchType.LAZY)
    @BatchSize(size = 25)  // Load 25 item collections at a time
    private List<OrderItem> items;
}

// Global configuration in application.properties
spring.jpa.properties.hibernate.default_batch_fetch_size=25
```

**Result:** Instead of 100 queries for 100 orders, you get 5 queries (100/25 + 1).

### 1.4 Use DTO Projections

**Impact: MEDIUM-HIGH (reduces data transfer, avoids lazy loading issues)**

For read-only queries, fetch only the columns you need directly into DTOs.

**Incorrect: Fetches entire entity**

```java
public List<UserDTO> getAllUsers() {
    return userRepository.findAll().stream()
        .map(user -> new UserDTO(user.getId(), user.getName(), user.getEmail()))
        .toList();
    // Fetches all 50 columns, uses only 3
}
```

**Correct: DTO Projection**

```java
// Interface-based projection
public interface UserSummary {
    Long getId();
    String getName();
    String getEmail();
}

public interface UserRepository extends JpaRepository<User, Long> {
    List<UserSummary> findAllProjectedBy();
}

// Or class-based with @Query
public record UserDTO(Long id, String name, String email) {}

@Query("SELECT new com.example.UserDTO(u.id, u.name, u.email) FROM User u")
List<UserDTO> findAllAsDTO();
```

### 1.5 Prefer LAZY Loading

**Impact: HIGH (prevents loading unused data)**

Always use `LAZY` for `@OneToMany` and `@ManyToMany`. Use `LAZY` for `@ManyToOne` and `@OneToOne` when not always needed.

**Incorrect: EAGER loads everything**

```java
@Entity
public class Order {
    @OneToMany(mappedBy = "order", fetch = FetchType.EAGER)  // Bad!
    private List<OrderItem> items;
    
    @ManyToOne(fetch = FetchType.EAGER)  // Often unnecessary
    private Customer customer;
}
```

**Correct: LAZY by default**

```java
@Entity
public class Order {
    @OneToMany(mappedBy = "order", fetch = FetchType.LAZY)
    private List<OrderItem> items;
    
    @ManyToOne(fetch = FetchType.LAZY)
    private Customer customer;
}
// Use JOIN FETCH or @EntityGraph when you need the data
```

### 1.6 Always Paginate Large Results

**Impact: HIGH (prevents OutOfMemoryError, improves response time)**

Never return unbounded lists from the database.

**Incorrect: Loads all records**

```java
@GetMapping("/users")
public List<User> getAllUsers() {
    return userRepository.findAll();  // Could be millions of records!
}
```

**Correct: Paginated response**

```java
@GetMapping("/users")
public Page<UserDTO> getUsers(
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size
) {
    Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
    return userRepository.findAll(pageable).map(this::toDTO);
}
```

### 1.7 Use Native Queries When Appropriate

**Impact: MEDIUM (better performance for complex operations)**

For bulk updates, complex aggregations, or database-specific features, use native queries.

```java
@Modifying
@Query(value = "UPDATE users SET status = 'INACTIVE' WHERE last_login < :cutoff", nativeQuery = true)
int deactivateInactiveUsers(@Param("cutoff") LocalDateTime cutoff);

@Query(value = """
    SELECT department_id, COUNT(*) as count, AVG(salary) as avg_salary
    FROM employees
    GROUP BY department_id
    HAVING COUNT(*) > 10
    """, nativeQuery = true)
List<Object[]> getDepartmentStats();
```

### 1.8 Configure HikariCP Connection Pool

**Impact: HIGH (prevents connection exhaustion)**

Properly size your connection pool based on workload.

```properties
# application.properties
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.idle-timeout=300000
spring.datasource.hikari.connection-timeout=20000
spring.datasource.hikari.max-lifetime=1200000
spring.datasource.hikari.leak-detection-threshold=60000
```

**Formula:** `connections = (core_count * 2) + effective_spindle_count`

For most apps: 10-20 connections is sufficient. More connections != better performance.

---

## 2. REST API Design

**Impact: CRITICAL**

Well-designed APIs improve developer experience, reduce bugs, and make systems easier to maintain.

### 2.1 Global Exception Handling

**Impact: HIGH (consistent error responses, cleaner controllers)**

Use `@RestControllerAdvice` to handle exceptions globally.

**Incorrect: Try-catch in every controller**

```java
@GetMapping("/users/{id}")
public ResponseEntity<?> getUser(@PathVariable Long id) {
    try {
        User user = userService.findById(id);
        return ResponseEntity.ok(user);
    } catch (UserNotFoundException e) {
        return ResponseEntity.notFound().build();
    } catch (Exception e) {
        return ResponseEntity.internalServerError().body("Error occurred");
    }
}
```

**Correct: Global exception handler**

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleNotFound(ResourceNotFoundException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
            HttpStatus.NOT_FOUND, ex.getMessage());
        problem.setTitle("Resource Not Found");
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(problem);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleValidation(MethodArgumentNotValidException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problem.setTitle("Validation Failed");
        problem.setProperty("errors", ex.getBindingResult().getFieldErrors().stream()
            .map(e -> Map.of("field", e.getField(), "message", e.getDefaultMessage()))
            .toList());
        return ResponseEntity.badRequest().body(problem);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleGeneric(Exception ex) {
        log.error("Unexpected error", ex);
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
            HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
        return ResponseEntity.internalServerError().body(problem);
    }
}

// Controller is now clean
@GetMapping("/users/{id}")
public UserDTO getUser(@PathVariable Long id) {
    return userService.findById(id);  // Throws ResourceNotFoundException if not found
}
```

### 2.2 Return RFC 7807 Problem Details

**Impact: MEDIUM-HIGH (standardized error format)**

Use Spring's `ProblemDetail` (Spring 6+) or custom error response following RFC 7807.

```java
// Spring 6+ built-in ProblemDetail
ProblemDetail problem = ProblemDetail.forStatusAndDetail(
    HttpStatus.BAD_REQUEST, "Invalid order data");
problem.setTitle("Validation Error");
problem.setType(URI.create("https://api.example.com/errors/validation"));
problem.setProperty("orderId", orderId);
problem.setProperty("errors", validationErrors);

// Response:
// {
//   "type": "https://api.example.com/errors/validation",
//   "title": "Validation Error",
//   "status": 400,
//   "detail": "Invalid order data",
//   "orderId": "12345",
//   "errors": [...]
// }
```

### 2.3 Standardize Pagination Response

**Impact: HIGH (consistent API contract)**

Always include pagination metadata in list responses.

```java
@GetMapping("/products")
public PageResponse<ProductDTO> getProducts(
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size,
    @RequestParam(defaultValue = "createdAt") String sortBy,
    @RequestParam(defaultValue = "desc") String sortDir
) {
    Sort sort = sortDir.equalsIgnoreCase("asc") 
        ? Sort.by(sortBy).ascending() 
        : Sort.by(sortBy).descending();
    Page<Product> result = productRepository.findAll(PageRequest.of(page, size, sort));
    return PageResponse.from(result.map(this::toDTO));
}

// Standardized response wrapper
public record PageResponse<T>(
    List<T> content,
    int page,
    int size,
    long totalElements,
    int totalPages,
    boolean first,
    boolean last
) {
    public static <T> PageResponse<T> from(Page<T> page) {
        return new PageResponse<>(
            page.getContent(),
            page.getNumber(),
            page.getSize(),
            page.getTotalElements(),
            page.getTotalPages(),
            page.isFirst(),
            page.isLast()
        );
    }
}
```

### 2.4 Implement API Versioning

**Impact: MEDIUM (allows API evolution)**

Choose one versioning strategy and apply consistently.

```java
// URI versioning (most common)
@RestController
@RequestMapping("/api/v1/users")
public class UserControllerV1 { }

@RestController
@RequestMapping("/api/v2/users")
public class UserControllerV2 { }

// Header versioning
@GetMapping(value = "/users", headers = "X-API-Version=1")
public List<UserV1DTO> getUsersV1() { }

@GetMapping(value = "/users", headers = "X-API-Version=2")
public List<UserV2DTO> getUsersV2() { }
```

### 2.5 Use DTOs Instead of Entities

**Impact: CRITICAL (security, flexibility, performance)**

Never expose JPA entities directly in API responses.

**Incorrect: Exposes entity**

```java
@GetMapping("/users/{id}")
public User getUser(@PathVariable Long id) {
    return userRepository.findById(id).orElseThrow();
    // Exposes password hash, internal IDs, lazy loading issues
}
```

**Correct: Use DTO**

```java
public record UserDTO(
    Long id,
    String name,
    String email,
    LocalDateTime createdAt
) {
    public static UserDTO from(User user) {
        return new UserDTO(user.getId(), user.getName(), 
            user.getEmail(), user.getCreatedAt());
    }
}

@GetMapping("/users/{id}")
public UserDTO getUser(@PathVariable Long id) {
    return userService.findById(id);  // Returns DTO
}
```

### 2.6 Validate All Input

**Impact: HIGH (prevents invalid data, security)**

Use Bean Validation annotations on DTOs.

```java
public record CreateUserRequest(
    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 100, message = "Name must be 2-100 characters")
    String name,
    
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    String email,
    
    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$",
             message = "Password must contain uppercase, lowercase, and number")
    String password
) {}

@PostMapping("/users")
public UserDTO createUser(@Valid @RequestBody CreateUserRequest request) {
    return userService.create(request);
}
```

### 2.7 Return Appropriate HTTP Status Codes

**Impact: HIGH (RESTful semantics)**

```java
@PostMapping("/orders")
@ResponseStatus(HttpStatus.CREATED)  // 201 for creation
public OrderDTO createOrder(@Valid @RequestBody CreateOrderRequest request) {
    return orderService.create(request);
}

@DeleteMapping("/orders/{id}")
@ResponseStatus(HttpStatus.NO_CONTENT)  // 204 for successful delete with no body
public void deleteOrder(@PathVariable Long id) {
    orderService.delete(id);
}

@PutMapping("/orders/{id}")
public OrderDTO updateOrder(@PathVariable Long id, @Valid @RequestBody UpdateOrderRequest request) {
    return orderService.update(id, request);  // 200 for update
}
```

**Common status codes:**
- `200 OK` - Successful GET, PUT, PATCH
- `201 Created` - Successful POST that creates resource
- `204 No Content` - Successful DELETE
- `400 Bad Request` - Validation errors, malformed request
- `401 Unauthorized` - Missing/invalid authentication
- `403 Forbidden` - Authenticated but not authorized
- `404 Not Found` - Resource doesn't exist
- `409 Conflict` - Duplicate resource, state conflict
- `500 Internal Server Error` - Unexpected server error

---

## 3. Security Best Practices

**Impact: HIGH**

Security misconfigurations are among the most common vulnerabilities in Spring Boot applications.

### 3.1 Configure Stateless JWT Authentication

**Impact: HIGH (scalable, secure authentication)**

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())  // Disable for stateless APIs
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                .anyRequest().authenticated())
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}

@Component
public class JwtAuthFilter extends OncePerRequestFilter {
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
            HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                String username = jwtService.extractUsername(token);
                if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                    if (jwtService.isTokenValid(token, userDetails)) {
                        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities());
                        SecurityContextHolder.getContext().setAuthentication(auth);
                    }
                }
            } catch (JwtException e) {
                log.debug("Invalid JWT token", e);
            }
        }
        chain.doFilter(request, response);
    }
}
```

### 3.2 Hash Passwords with BCrypt

**Impact: CRITICAL (prevents password exposure)**

```java
@Configuration
public class SecurityConfig {
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);  // Strength 10-12 recommended
    }
}

@Service
public class UserService {
    private final PasswordEncoder passwordEncoder;
    
    public User register(RegisterRequest request) {
        User user = new User();
        user.setEmail(request.email());
        user.setPassword(passwordEncoder.encode(request.password()));  // Hash before saving
        return userRepository.save(user);
    }
    
    public boolean authenticate(String email, String rawPassword) {
        User user = userRepository.findByEmail(email).orElseThrow();
        return passwordEncoder.matches(rawPassword, user.getPassword());
    }
}
```

### 3.3 Use Method-Level Security

**Impact: HIGH (fine-grained authorization)**

```java
@Configuration
@EnableMethodSecurity(prePostEnabled = true)
public class MethodSecurityConfig { }

@Service
public class OrderService {
    
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteAllOrders() { }
    
    @PreAuthorize("hasRole('ADMIN') or @orderSecurity.isOwner(#orderId, authentication)")
    public OrderDTO getOrder(Long orderId) { }
    
    @PreAuthorize("#userId == authentication.principal.id or hasRole('ADMIN')")
    public List<OrderDTO> getUserOrders(Long userId) { }
    
    @PostAuthorize("returnObject.userId == authentication.principal.id or hasRole('ADMIN')")
    public OrderDTO findOrder(Long id) { }
}

@Component("orderSecurity")
public class OrderSecurityEvaluator {
    public boolean isOwner(Long orderId, Authentication auth) {
        Order order = orderRepository.findById(orderId).orElse(null);
        return order != null && order.getUserId().equals(((UserPrincipal) auth.getPrincipal()).getId());
    }
}
```

### 3.4 Configure CORS Properly

**Impact: MEDIUM (prevents unauthorized cross-origin requests)**

```java
@Configuration
public class CorsConfig {
    
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(
            "https://app.example.com",
            "https://admin.example.com"
        ));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With"));
        config.setExposedHeaders(List.of("X-Total-Count", "X-Page-Number"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
```

**Never use `allowedOrigins("*")` with `allowCredentials(true)`.**

### 3.5 Externalize Secrets

**Impact: HIGH (prevents credential exposure)**

**Incorrect:**

```properties
# application.properties - NEVER commit secrets!
spring.datasource.password=MySecretP@ssword
jwt.secret=my-super-secret-key
```

**Correct:**

```properties
# application.properties - reference environment variables
spring.datasource.password=${DB_PASSWORD}
jwt.secret=${JWT_SECRET}

# Or use Spring Cloud Config / Vault
spring.cloud.vault.uri=https://vault.example.com
```

```bash
# Set environment variables
export DB_PASSWORD=actual_password
export JWT_SECRET=actual_secret
```

### 3.6 Use Short-Lived Tokens

**Impact: HIGH (limits exposure window)**

```java
@Service
public class JwtService {
    
    private static final long ACCESS_TOKEN_VALIDITY = 15 * 60 * 1000;  // 15 minutes
    private static final long REFRESH_TOKEN_VALIDITY = 7 * 24 * 60 * 60 * 1000;  // 7 days
    
    public String generateAccessToken(UserDetails user) {
        return Jwts.builder()
            .setSubject(user.getUsername())
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis() + ACCESS_TOKEN_VALIDITY))
            .signWith(getSigningKey(), SignatureAlgorithm.HS256)
            .compact();
    }
    
    public String generateRefreshToken(UserDetails user) {
        return Jwts.builder()
            .setSubject(user.getUsername())
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis() + REFRESH_TOKEN_VALIDITY))
            .signWith(getSigningKey(), SignatureAlgorithm.HS256)
            .compact();
    }
}
```

---

## 4. Caching Strategies

**Impact: HIGH**

Proper caching dramatically reduces database load and improves response times.

### 4.1 Use Caffeine for Local Caching

**Impact: HIGH (fast in-memory cache)**

```java
// pom.xml: spring-boot-starter-cache + caffeine

@Configuration
@EnableCaching
public class CacheConfig {
    
    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager();
        manager.setCaffeine(Caffeine.newBuilder()
            .maximumSize(1000)
            .expireAfterWrite(Duration.ofMinutes(10))
            .recordStats());
        return manager;
    }
}

@Service
public class ProductService {
    
    @Cacheable(value = "products", key = "#id")
    public ProductDTO findById(Long id) {
        return productRepository.findById(id)
            .map(this::toDTO)
            .orElseThrow(() -> new ResourceNotFoundException("Product", id));
    }
    
    @CacheEvict(value = "products", key = "#id")
    public void delete(Long id) {
        productRepository.deleteById(id);
    }
    
    @CachePut(value = "products", key = "#result.id")
    public ProductDTO update(Long id, UpdateProductRequest request) {
        Product product = productRepository.findById(id).orElseThrow();
        product.setName(request.name());
        return toDTO(productRepository.save(product));
    }
}
```

### 4.2 Configure Redis for Distributed Caching

**Impact: HIGH (shared cache across instances)**

```properties
spring.cache.type=redis
spring.data.redis.host=${REDIS_HOST:localhost}
spring.data.redis.port=${REDIS_PORT:6379}
spring.cache.redis.time-to-live=600000
spring.cache.redis.cache-null-values=false
```

```java
@Configuration
@EnableCaching
public class RedisCacheConfig {
    
    @Bean
    public RedisCacheConfiguration cacheConfiguration() {
        return RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(10))
            .disableCachingNullValues()
            .serializeKeysWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new StringRedisSerializer()))
            .serializeValuesWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new GenericJackson2JsonRedisSerializer()));
    }
}
```

### 4.3 Cache with Conditions

**Impact: MEDIUM (avoids caching inappropriate data)**

```java
@Cacheable(
    value = "users", 
    key = "#id",
    condition = "#id > 0",           // Only cache if id is valid
    unless = "#result == null"        // Don't cache null results
)
public UserDTO findById(Long id) {
    return userRepository.findById(id).map(this::toDTO).orElse(null);
}

@Cacheable(
    value = "search-results",
    key = "#query + '-' + #page",
    condition = "#query.length() >= 3"  // Only cache meaningful queries
)
public Page<ProductDTO> search(String query, int page) {
    return productRepository.search(query, PageRequest.of(page, 20));
}
```

### 4.4 Implement Cache Eviction

**Impact: MEDIUM-HIGH (maintains consistency)**

```java
@Service
public class CategoryService {
    
    @CacheEvict(value = "products", allEntries = true)  // Clear all products when category changes
    public void updateCategory(Long categoryId, UpdateCategoryRequest request) {
        // Update category
    }
    
    @Caching(evict = {
        @CacheEvict(value = "products", key = "#id"),
        @CacheEvict(value = "product-list", allEntries = true),
        @CacheEvict(value = "category-products", key = "#result.categoryId")
    })
    public ProductDTO updateProduct(Long id, UpdateProductRequest request) {
        // Update product
    }
}

// Scheduled cache refresh
@Scheduled(fixedRate = 300000)  // Every 5 minutes
@CacheEvict(value = "exchange-rates", allEntries = true)
public void refreshExchangeRates() {
    log.info("Refreshing exchange rates cache");
}
```

---

## 5. Transaction Management

**Impact: MEDIUM-HIGH**

Correct transaction configuration prevents data corruption and improves performance.

### 5.1 Use readOnly for Read Operations

**Impact: HIGH (performance optimization)**

```java
@Service
@Transactional(readOnly = true)  // Default for the class
public class ReportService {
    
    public List<SalesReportDTO> getMonthlySales(YearMonth month) {
        return reportRepository.findMonthlySales(month);
    }
    
    public DashboardDTO getDashboard() {
        return new DashboardDTO(
            orderRepository.countToday(),
            productRepository.countActive(),
            userRepository.countActive()
        );
    }
    
    @Transactional  // Override: this method writes
    public void generateReport(ReportRequest request) {
        Report report = new Report();
        // generate and save
        reportRepository.save(report);
    }
}
```

**Benefits:** Hibernate can skip dirty checking, use read-only database connections, and optimize for read replicas.

### 5.2 Choose Correct Propagation

**Impact: MEDIUM (controls transaction boundaries)**

```java
@Service
public class OrderService {
    
    @Transactional(propagation = Propagation.REQUIRED)  // Default: join existing or create new
    public OrderDTO createOrder(CreateOrderRequest request) {
        Order order = orderRepository.save(new Order(request));
        inventoryService.reserve(order.getItems());  // Joins this transaction
        return toDTO(order);
    }
    
    @Transactional(propagation = Propagation.REQUIRES_NEW)  // Always new transaction
    public void logOrderEvent(Long orderId, String event) {
        // Logged even if parent transaction fails
        orderEventRepository.save(new OrderEvent(orderId, event));
    }
    
    @Transactional(propagation = Propagation.MANDATORY)  // Must have existing transaction
    public void updateInventory(List<OrderItem> items) {
        // Throws if called without transaction
    }
}
```

### 5.3 Define rollbackFor

**Impact: HIGH (prevents silent failures)**

By default, `@Transactional` only rolls back on unchecked exceptions.

```java
// Incorrect: Checked exceptions don't trigger rollback
@Transactional
public void processPayment(PaymentRequest request) throws PaymentException {
    // PaymentException (checked) won't trigger rollback by default!
}

// Correct: Explicitly include checked exceptions
@Transactional(rollbackFor = {PaymentException.class, ValidationException.class})
public void processPayment(PaymentRequest request) throws PaymentException {
    // Now rolls back on these exceptions
}

// Or rollback on all exceptions
@Transactional(rollbackFor = Exception.class)
public void process(Request request) throws Exception { }
```

### 5.4 Apply at Service Layer

**Impact: HIGH (architectural correctness)**

**Incorrect: Transaction at controller**

```java
@RestController
public class OrderController {
    @Transactional  // Bad: mixing concerns
    @PostMapping("/orders")
    public OrderDTO createOrder(@RequestBody CreateOrderRequest request) { }
}
```

**Correct: Transaction at service layer**

```java
@RestController
public class OrderController {
    @PostMapping("/orders")
    public OrderDTO createOrder(@RequestBody CreateOrderRequest request) {
        return orderService.create(request);  // Service handles transaction
    }
}

@Service
public class OrderService {
    @Transactional
    public OrderDTO create(CreateOrderRequest request) {
        // Business logic with proper transaction boundaries
    }
}
```

---

## 6. Async & Concurrency

**Impact: MEDIUM**

Async processing improves throughput and responsiveness for I/O-bound operations.

### 6.1 Configure Custom TaskExecutor

**Impact: HIGH (prevents thread exhaustion)**

```java
@Configuration
@EnableAsync
public class AsyncConfig {
    
    @Bean(name = "taskExecutor")
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(20);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("async-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);
        executor.initialize();
        return executor;
    }
    
    @Bean(name = "emailExecutor")
    public Executor emailExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(5);
        executor.setThreadNamePrefix("email-");
        executor.initialize();
        return executor;
    }
}

@Service
public class NotificationService {
    
    @Async("emailExecutor")
    public CompletableFuture<Void> sendEmail(EmailRequest request) {
        // Send email asynchronously
        emailClient.send(request);
        return CompletableFuture.completedFuture(null);
    }
}
```

### 6.2 Use Virtual Threads

**Impact: HIGH (Java 21+ massive concurrency improvement)**

```java
// application.properties (Spring Boot 3.2+)
spring.threads.virtual.enabled=true

// Or manual configuration
@Configuration
public class VirtualThreadConfig {
    
    @Bean
    public TomcatProtocolHandlerCustomizer<?> protocolHandlerVirtualThreads() {
        return protocolHandler -> protocolHandler.setExecutor(
            Executors.newVirtualThreadPerTaskExecutor());
    }
    
    @Bean
    public AsyncTaskExecutor applicationTaskExecutor() {
        return new TaskExecutorAdapter(Executors.newVirtualThreadPerTaskExecutor());
    }
}
```

Virtual threads are ideal for I/O-bound workloads (database calls, HTTP clients, file I/O).

### 6.3 Use ApplicationEventPublisher

**Impact: MEDIUM (decouples components)**

```java
// Event
public record OrderCreatedEvent(Long orderId, Long userId, BigDecimal total) {}

// Publisher
@Service
public class OrderService {
    private final ApplicationEventPublisher eventPublisher;
    
    @Transactional
    public OrderDTO create(CreateOrderRequest request) {
        Order order = orderRepository.save(new Order(request));
        eventPublisher.publishEvent(new OrderCreatedEvent(
            order.getId(), order.getUserId(), order.getTotal()));
        return toDTO(order);
    }
}

// Listeners
@Component
public class OrderEventListeners {
    
    @Async
    @EventListener
    public void handleOrderCreated(OrderCreatedEvent event) {
        emailService.sendOrderConfirmation(event.orderId());
    }
    
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void sendNotificationAfterCommit(OrderCreatedEvent event) {
        // Only executes after transaction commits successfully
        pushNotificationService.notify(event.userId(), "Order placed!");
    }
}
```

---

## 7. Configuration & Resilience

**Impact: MEDIUM**

Proper configuration and resilience patterns prevent cascading failures.

### 7.1 Use Spring Profiles

**Impact: HIGH (environment-specific configuration)**

```properties
# application.properties (common)
spring.application.name=my-service

# application-dev.properties
spring.datasource.url=jdbc:h2:mem:testdb
logging.level.com.example=DEBUG

# application-prod.properties
spring.datasource.url=${DATABASE_URL}
logging.level.root=WARN
```

```java
@Configuration
@Profile("dev")
public class DevConfig {
    @Bean
    public DataSource dataSource() {
        return new EmbeddedDatabaseBuilder().setType(EmbeddedDatabaseType.H2).build();
    }
}

@Configuration
@Profile("prod")
public class ProdConfig {
    @Bean
    public DataSource dataSource() {
        return DataSourceBuilder.create()
            .url(System.getenv("DATABASE_URL"))
            .build();
    }
}
```

### 7.2 Implement Circuit Breakers

**Impact: HIGH (prevents cascading failures)**

```xml
<!-- pom.xml -->
<dependency>
    <groupId>io.github.resilience4j</groupId>
    <artifactId>resilience4j-spring-boot3</artifactId>
</dependency>
```

```java
@Service
public class PaymentService {
    
    @CircuitBreaker(name = "paymentGateway", fallbackMethod = "fallbackPayment")
    @Retry(name = "paymentGateway")
    public PaymentResult processPayment(PaymentRequest request) {
        return paymentGateway.process(request);
    }
    
    private PaymentResult fallbackPayment(PaymentRequest request, Exception e) {
        log.warn("Payment gateway unavailable, queuing request", e);
        paymentQueue.add(request);
        return PaymentResult.queued();
    }
}
```

```properties
# application.properties
resilience4j.circuitbreaker.instances.paymentGateway.slidingWindowSize=10
resilience4j.circuitbreaker.instances.paymentGateway.failureRateThreshold=50
resilience4j.circuitbreaker.instances.paymentGateway.waitDurationInOpenState=30s
resilience4j.circuitbreaker.instances.paymentGateway.permittedNumberOfCallsInHalfOpenState=3
resilience4j.retry.instances.paymentGateway.maxAttempts=3
resilience4j.retry.instances.paymentGateway.waitDuration=1s
resilience4j.retry.instances.paymentGateway.exponentialBackoffMultiplier=2
```

### 7.3 Add Retry with Backoff

**Impact: MEDIUM (handles transient failures)**

```java
@Service
public class ExternalApiService {
    
    @Retryable(
        retryFor = {RestClientException.class, TimeoutException.class},
        maxAttempts = 3,
        backoff = @Backoff(delay = 1000, multiplier = 2, maxDelay = 10000)
    )
    public ApiResponse callExternalApi(ApiRequest request) {
        return restClient.post()
            .uri("/api/endpoint")
            .body(request)
            .retrieve()
            .body(ApiResponse.class);
    }
    
    @Recover
    public ApiResponse recover(Exception e, ApiRequest request) {
        log.error("All retries failed for request: {}", request, e);
        return ApiResponse.error("Service temporarily unavailable");
    }
}
```

### 7.4 Enable Graceful Shutdown

**Impact: MEDIUM (prevents request loss during deployment)**

```properties
# application.properties
server.shutdown=graceful
spring.lifecycle.timeout-per-shutdown-phase=30s
```

```java
@Component
public class GracefulShutdownHandler implements DisposableBean {
    
    @Override
    public void destroy() {
        log.info("Starting graceful shutdown...");
        // Complete in-flight requests
        // Close database connections
        // Flush caches
        log.info("Graceful shutdown complete");
    }
}
```

---

## 8. Monitoring & Observability

**Impact: LOW-MEDIUM**

Proper monitoring enables debugging, performance tuning, and proactive alerting.

### 8.1 Enable Actuator Endpoints

**Impact: HIGH (production visibility)**

```properties
# application.properties
management.endpoints.web.exposure.include=health,info,metrics,prometheus
management.endpoint.health.show-details=when_authorized
management.endpoint.health.probes.enabled=true
management.info.env.enabled=true

# Security
management.endpoints.web.base-path=/actuator
```

```java
@Configuration
public class ActuatorSecurityConfig {
    
    @Bean
    public SecurityFilterChain actuatorSecurity(HttpSecurity http) throws Exception {
        return http
            .securityMatcher("/actuator/**")
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health/**").permitAll()
                .requestMatchers("/actuator/**").hasRole("ADMIN"))
            .build();
    }
}
```

### 8.2 Use Structured Logging

**Impact: HIGH (searchable, parseable logs)**

```xml
<!-- logback-spring.xml -->
<configuration>
    <appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
        <encoder class="net.logstash.logback.encoder.LogstashEncoder">
            <includeMdcKeyName>traceId</includeMdcKeyName>
            <includeMdcKeyName>spanId</includeMdcKeyName>
            <includeMdcKeyName>userId</includeMdcKeyName>
        </encoder>
    </appender>
    
    <springProfile name="prod">
        <root level="INFO">
            <appender-ref ref="JSON"/>
        </root>
    </springProfile>
</configuration>
```

```java
@Slf4j
@Service
public class OrderService {
    
    public OrderDTO create(CreateOrderRequest request) {
        log.info("Creating order", 
            kv("userId", request.userId()),
            kv("itemCount", request.items().size()),
            kv("total", request.total()));
        // ...
    }
}

// Output:
// {"@timestamp":"2026-02-09T10:30:00Z","level":"INFO","message":"Creating order",
//  "userId":"123","itemCount":5,"total":"99.99","traceId":"abc123"}
```

### 8.3 Add Trace ID Correlation

**Impact: MEDIUM (request tracing across services)**

```java
@Component
public class TraceIdFilter extends OncePerRequestFilter {
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
            HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        
        String traceId = request.getHeader("X-Trace-Id");
        if (traceId == null) {
            traceId = UUID.randomUUID().toString().substring(0, 8);
        }
        
        MDC.put("traceId", traceId);
        response.setHeader("X-Trace-Id", traceId);
        
        try {
            chain.doFilter(request, response);
        } finally {
            MDC.clear();
        }
    }
}
```

For full distributed tracing, use Micrometer Tracing with Zipkin or Jaeger.

---

## References

- [Spring Boot Reference Documentation](https://docs.spring.io/spring-boot/docs/current/reference/html/)
- [Hibernate ORM User Guide](https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html)
- [Vlad Mihalcea - High-Performance Java Persistence](https://vladmihalcea.com/)
- [Baeldung Spring Tutorials](https://www.baeldung.com/spring-tutorial)
- [Resilience4j Documentation](https://resilience4j.readme.io/)
