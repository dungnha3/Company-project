# Multi-tenant SaaS Rebuild - Implementation Plan

## 📋 Overview

**Objective:** Chuyển đổi hệ thống HR+Project Management từ single-tenant sang multi-tenant SaaS

**Key Features:**
- User tạo account tự do, có đầy đủ chức năng
- Admin công ty mời user vào công ty
- Admin bật/tắt features cho từng user
- 1 User có thể join nhiều công ty

**Hybrid Architecture:**
- **Spring Boot + MySQL** - API Server, Business Logic, Source of Truth
- **Firebase (Firestore + RTDB)** - Real-time Chat, Notifications, GPS Tracking
- **Xem chi tiết:** [Firebase Integration Plan](file:///c:/DACN/docs/firebase_integration_plan.md)

---

## 📑 Table of Contents

| # | Section | Description |
|---|---------|-------------|
| 1 | [Phase 1: Database](#phase-1) | Company, CompanyMember, CompanySettings entities |
| 2 | [Phase 2: Auth & Context](#phase-2) | Google OAuth, JWT, TenantContext |
| 3 | [Phase 3: Permission System](#phase-3) | 2-Level Permissions, Role Templates |
| 4 | [Phase 4: API Changes](#phase-4) | Company endpoints, Member management |
| 5 | [Phase 5: Mobile Changes](#phase-5) | Company selector, X-Company-Id header |
| 6 | [Phase 6: Testing](#phase-6) | Data isolation, Permission tests |
| 7 | [MVP Phasing Strategy](#mvp) | 3 MVP phases: Foundation, Stability, Scale |
| 8 | [Checklist](#checklist) | 40+ implementation items |
| 9 | [Phase 0: Risk Mitigation](#phase-0) | Hibernate Filter, Migration, Global Resources |
| 10 | [Phase 0.5: Advanced Security](#phase-05) | Native Query, Async context, IDOR, Rate Limiting |
| 11 | [Final Audit Fixes](#final-audit) | Entity Test, Cache Safety, Public Assets, Invite Flow |

---

## 🛠️ Tech Stack (Khuyến nghị)

| Layer | Công nghệ | Ghi chú |
|-------|-----------|---------|
| Backend | Spring Boot | Giữ nguyên |
| Database | SQL Server → MySQL | Xem xét migrate |
| **Caching** | **Redis** | ✅ Nên thêm (Cache settings, Rate limit, Token blacklist) |
| **Storage** | **MinIO / S3** | ✅ Nên thêm (Thay local folder, hỗ trợ scale) |
| **Runtime** | **Docker** | ✅ Nên thêm (Deploy nhất quán) |
| Gateway | Nginx | HTTPS, Load Balancing |
| Mobile | Flutter + Firebase | Giữ nguyên Hybrid |
| CI/CD | GitHub Actions | Auto test + deploy |

> [!CAUTION]
> **ĐỪNG DÙNG (lúc này):**
> - ❌ Microservices (giữ Modular Monolith)
> - ❌ Kafka/RabbitMQ (dùng @Async đủ rồi)
> - ❌ Kubernetes (Docker Compose đủ)

---

## ⚠️ Hardcoded Values Cần Sửa

> [!WARNING]
> Các giá trị này đang hardcode trong config, cần chuyển sang `CompanySettings` để multi-tenant.

| File | Giá trị | Hiện tại | Cần sửa |
|------|---------|----------|---------|
| `ChamCongService.java` | GPS Latitude | `company.latitude=10.855059` | → `CompanySettings.officeLatitude` |
| `ChamCongService.java` | GPS Longitude | `company.longitude=106.779390` | → `CompanySettings.officeLongitude` |
| `ChamCongService.java` | GPS Radius | `company.radius=500` | → `CompanySettings.allowedRadius` |
| `FileStorageService.java` | User Quota | `5GB per user` | → `CompanySettings.userStorageQuota` |
| `FileStorageService.java` | Admin Quota | `10GB per admin` | → Theo Plan (FREE/PRO/ENTERPRISE) |
| `SessionService.java` | Max Sessions | `5 concurrent` | → Theo Plan |
| `application.properties` | Leave Days | `12 days/year` | → `CompanySettings.maxLeaveDays` |
| `application.properties` | Max Members | `50 per project` | → Theo Plan |

### Fix cho GPS:

```java
// ❌ Hiện tại (Single-tenant)
@Value("${company.latitude:10.855059}")
private double companyLatitude;

// ✅ Sau khi sửa (Multi-tenant)
public void checkIn(CheckInRequest request) {
    CompanySettings settings = TenantContext.getCompanySettings();
    
    if (settings.getOfficeLatitude() == null) {
        throw new BadRequestException("Admin chưa cấu hình vị trí văn phòng!");
    }
    
    double distance = GPSUtil.calculate(
        request.getLat(), request.getLng(),
        settings.getOfficeLatitude(), 
        settings.getOfficeLongitude()
    );
    
    if (distance > settings.getAllowedRadius()) {
        throw new BadRequestException("Bạn cách văn phòng " + distance + "m");
    }
}
```

### CompanySettings mở rộng:

```java
@Entity
public class CompanySettings {
    // ... existing fields (modules enabled)
    
    // GPS Chấm công
    private Double officeLatitude;
    private Double officeLongitude;
    private Double allowedRadius = 500.0; // mặc định 500m
    private boolean isGpsEnforced = true;
    
    // Quotas (override by Plan if null)
    private Long storageQuotaBytes;       // null = dùng theo Plan
    private Integer maxLeaveDaysPerYear;  // null = 12 days default
    private Integer maxConcurrentSessions; // null = dùng theo Plan
}
```

---

### 1.1 New Entities

#### [NEW] Company.java
```java
@Entity
@Table(name = "companies")
public class Company {
    @Id @GeneratedValue
    private Long companyId;
    
    @Column(unique = true)
    private String name;
    
    @Column(unique = true) 
    private String slug; // cho URL path: /company/{slug}
    
    private String logoUrl;
    private String address;
    private String phone;
    private String email;
    
    @Enumerated(EnumType.STRING)
    private Plan plan; // FREE, PRO, ENTERPRISE
    
    private boolean isActive = true;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    @OneToOne(cascade = CascadeType.ALL)
    private CompanySettings settings;
}
```

#### [NEW] CompanyMember.java
```java
@Entity
@Table(name = "company_members",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "company_id"}))
public class CompanyMember {
    @Id @GeneratedValue
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;
    
    @ManyToOne
    @JoinColumn(name = "company_id")
    private Company company;
    
    @Enumerated(EnumType.STRING)
    private CompanyRole role; // OWNER, ADMIN, MANAGER_HR, MANAGER_ACCOUNTING, MANAGER_PROJECT, EMPLOYEE
    
    // Admin bật/tắt features per user
    @Convert(converter = PermissionConverter.class)
    private UserPermissions permissions;
    
    private boolean isActive = true;
    private LocalDateTime joinedAt;
    private LocalDateTime invitedAt;
    private String invitedBy;
}
```

#### [NEW] CompanySettings.java
```java
@Entity
@Table(name = "company_settings")
public class CompanySettings {
    @Id
    private Long companyId;
    
    // Feature toggles
    private boolean hrModuleEnabled = true;
    private boolean projectModuleEnabled = true;
    private boolean chatModuleEnabled = true;
    private boolean aiModuleEnabled = false;
    private boolean storageModuleEnabled = true;
    
    // HR sub-features
    private boolean attendanceEnabled = true;
    private boolean leaveEnabled = true;
    private boolean salaryEnabled = true;
    private boolean contractEnabled = true;
    private boolean reviewEnabled = true;
    
    // Limits (based on plan)
    private int maxEmployees = 50;
    private int maxProjects = 10;
    private long maxStorageBytes = 1_073_741_824L; // 1GB
    
    // GPS settings (per company)
    private Double officeLatitude;
    private Double officeLongitude;  
    private Double allowedRadius = 100.0; // meters
}
```

#### [NEW] UserPermissions.java (Embeddable/JSON)
```java
public class UserPermissions {
    // HR permissions
    private boolean canViewAllEmployees = false;
    private boolean canManageEmployees = false;
    private boolean canViewSalary = false;
    private boolean canManageSalary = false;
    private boolean canApproveLeave = false;
    
    // Project permissions
    private boolean canCreateProjects = false;
    private boolean canManageAllProjects = false;
    
    // Chat permissions  
    private boolean canCreateGroups = true;
    
    // Storage permissions
    private boolean canUploadFiles = true;
    private long personalStorageLimit = 104_857_600L; // 100MB
}
```

### 1.2 Modify Existing Entities

Thêm `companyId` vào tất cả entity có dữ liệu thuộc về công ty:

| Entity | Add Field | Notes |
|--------|-----------|-------|
| NhanVien | `@ManyToOne Company company` | Required |
| PhongBan | `@ManyToOne Company company` | Required |
| ChucVu | `@ManyToOne Company company` | Required |
| ChamCong | `companyId` via NhanVien | Indirect |
| BangLuong | `companyId` via NhanVien | Indirect |
| NghiPhep | `companyId` via NhanVien | Indirect |
| HopDong | `companyId` via NhanVien | Indirect |
| DanhGia | `companyId` via NhanVien | Indirect |
| Project | `@ManyToOne Company company` | Required |
| Issue | `companyId` via Project | Indirect |
| Sprint | `companyId` via Project | Indirect |
| ChatRoom | `@ManyToOne Company company` | For GROUP/PROJECT types |
| File | `@ManyToOne Company company` | Optional (personal vs company) |
| Folder | `@ManyToOne Company company` | Optional |

### 1.3 User Entity Changes

```java
@Entity
public class User {
    // ... existing fields ...
    
    // REMOVE old role field
    // private Role role; ❌ REMOVED
    
    // Add new relationships
    @OneToMany(mappedBy = "user")
    private List<CompanyMember> companyMemberships;
    
    // Personal data (not company-specific)
    private String avatarUrl;
    private String fcmToken;
    private boolean isOnline;
    private LocalDateTime lastLogin;
}
```

---

## 🔐 Phase 2: Authentication & Context (2-3 ngày)

### 2.1 Google OAuth Implementation

#### [NEW] GoogleAuthController.java
```java
@RestController
@RequestMapping("/api/auth/google")
public class GoogleAuthController {
    
    @PostMapping("/callback")
    public AuthResponse handleGoogleCallback(@RequestBody GoogleTokenRequest request) {
        // 1. Verify Google ID token
        // 2. Extract email, name, picture
        // 3. Find or create User
        // 4. Return JWT tokens
    }
}
```

### 2.2 JWT with Company Context

```java
// JWT Claims
{
  "sub": "user@email.com",
  "userId": 123,
  "currentCompanyId": 456, // Active company context
  "companies": [456, 789], // All company IDs user belongs to
  "iat": 1234567890,
  "exp": 1234567890
}
```

### 2.3 Tenant Context

```java
@Component
public class TenantContext {
    private static final ThreadLocal<Long> currentCompanyId = new ThreadLocal<>();
    private static final ThreadLocal<CompanyMember> currentMembership = new ThreadLocal<>();
    
    public static Long getCompanyId() {
        return currentCompanyId.get();
    }
    
    public static CompanyMember getMembership() {
        return currentMembership.get();
    }
}

@Component
public class TenantInterceptor implements HandlerInterceptor {
    @Override
    public boolean preHandle(HttpServletRequest request, ...) {
        // Extract company context from JWT or header
        // Set TenantContext
        // Validate user has access to company
    }
}
```

---

## ⚙️ Phase 3: Permission System (2-3 ngày)

> **Architecture:** 2-Level Permission Model
> - **Level 1:** Company Settings (Feature Flags) - Ảnh hưởng toàn công ty
> - **Level 2:** User Permissions (Granular) - Ảnh hưởng từng user
> - **Role:** Chỉ là Template + Label, KHÔNG dùng để check quyền

### 3.1 CompanyMember Entity (JSON Permissions)

```java
@Entity
@Table(name = "company_members")
public class CompanyMember {
    @Id @GeneratedValue
    private Long id;
    
    @ManyToOne
    private User user;
    
    @ManyToOne
    private Company company;
    
    // Role chỉ để hiển thị label + template source
    @Enumerated(EnumType.STRING)
    private CompanyRole role; // OWNER, ADMIN, MANAGER_HR, MANAGER_PROJECT, EMPLOYEE
    
    // Permissions lưu dạng JSON - KHÔNG phụ thuộc role
    @Column(columnDefinition = "json")
    @Convert(converter = UserPermissionsConverter.class)
    private UserPermissions permissions;
    
    private boolean isActive = true;
    private LocalDateTime joinedAt;
}
```

### 3.2 UserPermissions Class (POJO → JSON)

```java
public class UserPermissions implements Serializable {
    
    // ===== HR GROUP =====
    private boolean hrViewList = false;      // Xem danh sách nhân viên
    private boolean hrEditProfile = false;   // Sửa thông tin nhân viên
    private boolean hrManageContracts = false; // Quản lý hợp đồng
    
    // ===== SALARY GROUP =====
    private boolean salaryView = false;      // Xem bảng lương
    private boolean salaryCalculate = false; // Tính lương
    private boolean salaryApprove = false;   // Duyệt lương
    
    // ===== LEAVE GROUP =====
    private boolean leaveApprove = false;    // Duyệt nghỉ phép
    private boolean leaveViewAll = false;    // Xem tất cả đơn nghỉ
    
    // ===== ATTENDANCE GROUP =====
    private boolean attendanceViewAll = false; // Xem chấm công toàn bộ
    private boolean attendanceEdit = false;    // Sửa chấm công
    
    // ===== PROJECT GROUP =====
    private boolean projectCreate = false;   // Tạo dự án
    private boolean projectManageAll = false; // Quản lý tất cả dự án
    private boolean projectDelete = false;   // Xóa dự án
    
    // ===== CHAT GROUP =====
    private boolean chatCreateGroup = true;  // Tạo group chat
    
    // ===== STORAGE GROUP =====
    private boolean storageUpload = true;    // Upload file
    private long storageLimit = 104_857_600L; // 100MB default
    
    // Getters, Setters, Clone method
}
```

### 3.3 Role Templates (Preset Permissions)

```java
@Service
public class RoleTemplateService {
    
    private static final Map<CompanyRole, UserPermissions> TEMPLATES = Map.of(
        CompanyRole.OWNER, createOwnerPermissions(),
        CompanyRole.ADMIN, createAdminPermissions(),
        CompanyRole.MANAGER_HR, createHRManagerPermissions(),
        CompanyRole.MANAGER_PROJECT, createProjectManagerPermissions(),
        CompanyRole.EMPLOYEE, createEmployeePermissions()
    );
    
    public UserPermissions getTemplate(CompanyRole role) {
        return TEMPLATES.get(role).clone();
    }
    
    private static UserPermissions createHRManagerPermissions() {
        UserPermissions perms = new UserPermissions();
        // HR Group - Full access
        perms.setHrViewList(true);
        perms.setHrEditProfile(true);
        perms.setHrManageContracts(true);
        // Leave - Can approve
        perms.setLeaveApprove(true);
        perms.setLeaveViewAll(true);
        // Attendance
        perms.setAttendanceViewAll(true);
        perms.setAttendanceEdit(true);
        // Salary - View only (not calculate) by default
        perms.setSalaryView(true);
        perms.setSalaryCalculate(false);
        return perms;
    }
    
    // Similar methods for other roles...
}
```

### 3.4 Assign Role với Template Copy

```java
@Service
public class CompanyMemberService {
    
    @Autowired
    private RoleTemplateService roleTemplateService;
    
    public void assignRole(CompanyMember member, CompanyRole newRole) {
        // 1. Set role (chỉ để hiển thị)
        member.setRole(newRole);
        
        // 2. Copy permissions từ template
        UserPermissions template = roleTemplateService.getTemplate(newRole);
        member.setPermissions(template);
        
        // 3. Save
        memberRepository.save(member);
        
        // Admin có thể customize sau này
    }
    
    // Admin customize individual permission
    public void updatePermission(Long memberId, String permissionKey, boolean value) {
        CompanyMember member = memberRepository.findById(memberId).orElseThrow();
        
        // Update specific permission (không đổi role)
        UserPermissions perms = member.getPermissions();
        setPermissionByKey(perms, permissionKey, value);
        
        memberRepository.save(member);
    }
}
```

### 3.5 Permission Service (2-Level Check)

```java
@Service
public class PermissionService {
    
    @Autowired
    private CompanyService companyService;
    
    /**
     * Check 2 levels:
     * 1. Company Settings (Feature Flag) - Is feature enabled for company?
     * 2. User Permissions (Granular) - Does user have this permission?
     */
    public boolean hasPermission(String featureKey, String permissionKey) {
        Long companyId = TenantContext.getCompanyId();
        CompanyMember member = TenantContext.getMembership();
        
        // Level 1: Company Feature Flag (cached)
        CompanySettings settings = companyService.getSettingsCached(companyId);
        if (!isFeatureEnabled(settings, featureKey)) {
            return false; // Company disabled this feature
        }
        
        // Level 2: User Permission (granular)
        return checkUserPermission(member.getPermissions(), permissionKey);
    }
    
    private boolean isFeatureEnabled(CompanySettings settings, String featureKey) {
        return switch (featureKey) {
            case "HR" -> settings.isHrModuleEnabled();
            case "SALARY" -> settings.isHrModuleEnabled() && settings.isSalaryEnabled();
            case "PROJECT" -> settings.isProjectModuleEnabled();
            case "CHAT" -> settings.isChatModuleEnabled();
            case "AI" -> settings.isAiModuleEnabled();
            case "STORAGE" -> settings.isStorageModuleEnabled();
            default -> false;
        };
    }
    
    private boolean checkUserPermission(UserPermissions perms, String key) {
        if (perms == null) return false;
        return switch (key) {
            case "VIEW_SALARY" -> perms.isSalaryView();
            case "CALCULATE_SALARY" -> perms.isSalaryCalculate();
            case "APPROVE_LEAVE" -> perms.isLeaveApprove();
            case "VIEW_ALL_EMPLOYEES" -> perms.isHrViewList();
            case "CREATE_PROJECT" -> perms.isProjectCreate();
            default -> false;
        };
    }
}
```

### 3.6 Usage in Controllers

```java
// Option 1: Annotation (SpEL)
@GetMapping("/api/bang-luong")
@PreAuthorize("@permissionService.hasPermission('SALARY', 'VIEW_SALARY')")
public ResponseEntity<?> getBangLuong() {
    // ...
}

// Option 2: Programmatic check
@GetMapping("/api/bang-luong/{id}")
public ResponseEntity<?> getSalaryDetail(@PathVariable Long id) {
    if (!permissionService.hasPermission("SALARY", "VIEW_SALARY")) {
        throw new ForbiddenException("No permission to view salary");
    }
    // ...
}
```

### 3.7 Frontend: Admin Permission Editor

```
┌─────────────────────────────────────────────────────────────┐
│  👤 Nguyễn Văn A                                            │
│  Role: Quản lý Nhân sự (MANAGER_HR)                         │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📋 NHÂN SỰ                                                 │
│  [✓] Xem danh sách nhân viên                               │
│  [✓] Sửa thông tin nhân viên                               │
│  [✓] Quản lý hợp đồng                                      │
│                                                             │
│  💰 LƯƠNG                                                   │
│  [✓] Xem bảng lương                                        │
│  [ ] Tính lương          ← Admin đã TẮT cho user này       │
│  [ ] Duyệt lương                                           │
│                                                             │
│  📅 NGHỈ PHÉP                                               │
│  [✓] Duyệt nghỉ phép                                       │
│  [✓] Xem tất cả đơn                                        │
│                                                             │
│              [💾 Lưu thay đổi]                              │
└─────────────────────────────────────────────────────────────┘
```
```

---

## 🔌 Phase 4: API Changes (1-2 ngày)

### 4.1 New Endpoints

#### Company Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/companies` | Create company (user becomes OWNER) |
| GET | `/api/companies/my` | Get my companies |
| GET | `/api/companies/{slug}` | Get company info |
| PUT | `/api/companies/{companyId}` | Update company (OWNER/ADMIN) |
| DELETE | `/api/companies/{companyId}` | Delete company (OWNER only) |

#### Company Members
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/companies/{companyId}/members` | List members |
| POST | `/api/companies/{companyId}/members/invite` | Invite user |
| PUT | `/api/companies/{companyId}/members/{userId}/role` | Change role |
| PUT | `/api/companies/{companyId}/members/{userId}/permissions` | Update permissions |
| DELETE | `/api/companies/{companyId}/members/{userId}` | Remove member |
| POST | `/api/companies/{companyId}/leave` | Leave company |

#### Company Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/companies/{companyId}/settings` | Get settings |
| PUT | `/api/companies/{companyId}/settings` | Update settings |
| PUT | `/api/companies/{companyId}/settings/features` | Toggle features |

### 4.2 Context Switch

```
// Switch active company
POST /api/companies/{companyId}/switch
→ Returns new JWT with updated currentCompanyId
```

---

## 📱 Phase 5: Mobile Changes (1-2 ngày)

### 5.1 Company Selection Screen

- After login, show company selector if user has multiple companies
- Option to create new company
- Option to join company via invite link

### 5.2 Company Context Header

```dart
// Add X-Company-Id header to all requests
final companyId = await SecureStorage.read('currentCompanyId');
headers['X-Company-Id'] = companyId;
```

### 5.3 Settings Screen Updates

- Company switcher in profile
- Company settings (for ADMIN)
- Member management (for ADMIN)

---

## 🧪 Phase 6: Testing (2-3 ngày)

### 6.1 Data Isolation Tests

```java
@Test
void testDataIsolation() {
    // Create 2 companies
    // Create employees in each
    // Verify company A cannot see company B's data
}
```

### 6.2 Permission Tests

```java
@Test
void testFeatureDisabled() {
    // Disable HR module for company
    // Verify HR endpoints return 403
}

@Test
void testUserPermission() {
    // User without MANAGE_SALARY permission
    // Verify cannot access salary endpoints
}
```

---

## 📅 MVP Phasing Strategy

> [!IMPORTANT]
> **Đừng làm hết cùng lúc!** Chia theo MVP để giảm risk.

### 🚀 MVP Phase 1: Core Foundation (2-3 tuần)

> **Goal:** Data không lộ, User có thể login và dùng chức năng cơ bản

| Task | Priority | Duration |
|------|----------|----------|
| Multi-tenant Database | 🔴 Critical | 2-3 days |
| Auth + Company Context | 🔴 Critical | 2-3 days |
| Permission System | 🔴 Critical | 2-3 days |
| **Mobile Versioning** | 🔴 Critical | 3-4 hours |
| API Changes | 🟡 High | 1-2 days |
| Data Isolation Tests | 🔴 Critical | 2 days |

**Mobile Versioning (MUST HAVE):**

```java
// Endpoint check version
@GetMapping("/api/app/version")
public ResponseEntity<?> checkVersion(@RequestHeader("X-App-Version") String version) {
    AppVersion current = parseVersion(version);
    AppVersion minimum = appConfig.getMinimumVersion();
    
    if (current.compareTo(minimum) < 0) {
        return ResponseEntity.status(426) // Upgrade Required
            .body(Map.of(
                "forceUpdate", true,
                "message", "Vui lòng cập nhật app để tiếp tục sử dụng",
                "storeUrl", appConfig.getStoreUrl()
            ));
    }
    
    return ResponseEntity.ok(Map.of("forceUpdate", false));
}
```

```dart
// Flutter - check on app start
Future<void> checkAppVersion() async {
  final response = await api.get('/api/app/version');
  if (response['forceUpdate'] == true) {
    showForceUpdateDialog(response['storeUrl']);
  }
}
```

---

### 🔧 MVP Phase 2: Stability (2 tuần)

> **Goal:** Không mất dữ liệu, không đầy ổ cứng

| Task | Priority | Duration |
|------|----------|----------|
| **Soft Delete cho mọi entity** | 🔴 Critical | 2 days |
| **Company Data Export** | 🟡 High | 2 days |
| Firebase Notifications | 🟡 High | 1 week |
| **Cloud Storage (S3/GCS)** | 🔴 Critical | 3-4 days |
| Billing: Manual (DB flag) | 🟢 Medium | 1 day |

> [!WARNING]
> **⚠️ GAP FIX: Cloud Storage for Chat Files**
> 
> URL local (`/uploads/anh.jpg`) không work trên Mobile 4G!
> PHẢI chuyển sang Cloud Storage với presigned URLs.

**Cloud Storage Strategy:**

```java
@Service
public class CloudStorageService {
    
    private final S3Client s3Client; // hoặc MinIO Client
    
    /**
     * Upload file và trả về public URL
     */
    public String uploadFile(MultipartFile file, Long companyId) {
        String key = String.format("companies/%d/files/%s/%s", 
            companyId, 
            UUID.randomUUID().toString(),
            file.getOriginalFilename());
        
        s3Client.putObject(PutObjectRequest.builder()
            .bucket(bucketName)
            .key(key)
            .build(), 
            RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
        
        // Return public URL or presigned URL
        return getPublicUrl(key);
    }
    
    /**
     * Tạo presigned URL (có thời hạn) cho file private
     */
    public String getPresignedUrl(String key, Duration expiry) {
        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
            .signatureDuration(expiry) // e.g., Duration.ofHours(1)
            .getObjectRequest(GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build())
            .build();
        
        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }
}

// Chat file upload returns cloud URL
@PostMapping("/api/chat/rooms/{roomId}/files")
public ResponseEntity<?> uploadChatFile(@PathVariable Long roomId,
                                        @RequestParam MultipartFile file) {
    Long companyId = TenantContext.getCompanyId();
    
    // Upload to S3/MinIO
    String cloudUrl = cloudStorageService.uploadFile(file, companyId);
    
    // Save to DB
    File fileEntity = new File();
    fileEntity.setUrl(cloudUrl); // Cloud URL, not /uploads/...
    fileEntity.setCompany(companyRepository.getReferenceById(companyId));
    fileRepository.save(fileEntity);
    
    // Sync to Firestore with cloud URL
    firebaseSyncService.syncChatFile(roomId, fileEntity);
    
    return ResponseEntity.ok(fileEntity);
}
```

**Soft Delete Pattern:**

```java
@MappedSuperclass
public abstract class SoftDeletableEntity {
    private boolean isDeleted = false;
    private LocalDateTime deletedAt;
    private Long deletedBy;
    
    // Scheduled job: Xóa thật sau 30 ngày
}

// Repository với @Where
@Entity
@Where(clause = "is_deleted = false")
public class Project extends SoftDeletableEntity { }
```

**Company Data Export (Cho Admin restore):**

```java
@PostMapping("/api/admin/companies/{companyId}/export")
@RequireRole("PLATFORM_ADMIN")
public ResponseEntity<?> exportCompanyData(@PathVariable Long companyId) {
    // Export tất cả data của company sang JSON/ZIP
    // Lưu vào S3 để admin có thể restore
}

@PostMapping("/api/admin/companies/{companyId}/restore")
public ResponseEntity<?> restoreCompanyData(@PathVariable Long companyId,
                                            @RequestParam String backupId) {
    // Restore từ backup, chỉ ảnh hưởng company này
}
```

---

### 📈 MVP Phase 3: Scale (3-4 tuần)

> **Goal:** Nhiều user không làm chậm hệ thống

| Task | Priority | Duration |
|------|----------|----------|
| **Billing Lifecycle** | 🟡 High | 1 week |
| **AI Rate Limiting per Company** | 🟡 High | 2 days |
| GPS Tracking (Firebase RTDB) | 🟢 Medium | 1 week |
| Payment Gateway | 🟢 Low | 2 weeks |

**Billing Lifecycle:**

```java
@Entity
public class Company {
    @Enumerated(EnumType.STRING)
    private Plan plan; // FREE, PRO, ENTERPRISE
    
    private LocalDate subscriptionEndDate;
    private boolean isGracePeriod = false; // Ân hạn 7 ngày
    private boolean isLocked = false;      // Khóa khi hết hạn
}

// Scheduled job: Check hết hạn hàng ngày
@Scheduled(cron = "0 0 0 * * *") // Midnight
public void checkSubscriptions() {
    List<Company> expiredCompanies = companyRepository
        .findBySubscriptionEndDateBeforeAndIsLockedFalse(LocalDate.now());
    
    for (Company company : expiredCompanies) {
        if (company.isGracePeriod()) {
            // Đã qua ân hạn -> Khóa
            company.setLocked(true);
            notifyService.sendLockNotification(company);
        } else {
            // Bắt đầu ân hạn 7 ngày
            company.setGracePeriod(true);
            notifyService.sendExpiredWarning(company);
        }
        companyRepository.save(company);
    }
}

// Downgrade logic
public void downgrade(Long companyId, Plan newPlan) {
    Company company = companyRepository.findById(companyId).orElseThrow();
    
    // Check quota violations
    long currentStorage = storageService.getUsedStorage(companyId);
    long newLimit = newPlan.getStorageLimit();
    
    if (currentStorage > newLimit) {
        // Không cho upload thêm, nhưng không xóa data cũ
        company.setStorageBlocked(true);
    }
    
    int currentEmployees = memberRepository.countByCompanyId(companyId);
    if (currentEmployees > newPlan.getMaxEmployees()) {
        // Warning nhưng không block (grace period)
        notifyService.sendEmployeeLimitWarning(company, currentEmployees, newPlan);
    }
    
    company.setPlan(newPlan);
    companyRepository.save(company);
}
```

**AI Rate Limiting per Company:**

```java
@Service
public class AIRateLimiter {
    
    // Redis-based counters per company
    private final RedisTemplate<String, Integer> redis;
    
    public boolean canUseAI(Long companyId, Long userId) {
        String companyKey = "ai:company:" + companyId + ":daily";
        String userKey = "ai:user:" + userId + ":daily";
        
        // Company limit (based on plan)
        Integer companyCount = redis.opsForValue().get(companyKey);
        int companyLimit = getCompanyLimit(companyId); // FREE=100, PRO=1000
        
        if (companyCount != null && companyCount >= companyLimit) {
            throw new QuotaExceededException("Công ty đã hết quota AI hôm nay");
        }
        
        // User limit (prevent abuse)
        Integer userCount = redis.opsForValue().get(userKey);
        if (userCount != null && userCount >= 50) { // Max 50/user/day
            throw new QuotaExceededException("Bạn đã hết lượt sử dụng AI hôm nay");
        }
        
        // Increment
        redis.opsForValue().increment(companyKey);
        redis.opsForValue().increment(userKey);
        redis.expire(companyKey, Duration.ofDays(1));
        redis.expire(userKey, Duration.ofDays(1));
        
        return true;
    }
}
```

---

## 📊 Overall Timeline

| MVP Phase | Duration | Deliverable |
|-----------|----------|-------------|
| Phase 1: Foundation | 2-3 weeks | Data isolation, Auth, Permissions |
| Phase 2: Stability | 2 weeks | Soft Delete, Backup, Cloud Storage |
| Phase 3: Scale | 3-4 weeks | Billing, AI limits, GPS |
| Firebase Integration | 4-5 weeks | Parallel with above |
| **Total** | **8-12 weeks** | Full SaaS ready |

---

## ✅ Checklist

### Database
- [ ] Create Company entity
- [ ] Create CompanyMember entity
- [ ] Create CompanySettings entity
- [ ] Create UserPermissions class
- [ ] Add companyId to all entities
- [ ] Remove User.role field
- [ ] Migration scripts

### Backend
- [ ] TenantContext service
- [ ] TenantInterceptor
- [ ] Google OAuth controller
- [ ] FeatureService
- [ ] PermissionService
- [ ] @RequireFeature annotation
- [ ] @RequirePermission annotation
- [ ] Company CRUD endpoints
- [ ] Member management endpoints
- [ ] Settings endpoints

### Mobile
- [ ] Company selector screen
- [ ] X-Company-Id header
- [ ] Company settings screen
- [ ] Member management screen
- [ ] Force Update check on app start

### Testing
- [ ] Data isolation tests
- [ ] Permission tests
- [ ] Feature toggle tests
- [ ] Multi-company user tests
- [ ] **Entity Filter Enforcement Test** (see below)

---

## 🛡️ Final Audit Fixes (9.9/10 → 10/10)

### FA-1: Entity Filter Enforcement Test (CRITICAL)

**Vấn đề:** Dev mới quên `@Filter` hoặc quên extend `TenantScopedEntity` → Lộ data

**Giải pháp: Automated Test trong CI/CD**

```java
@Test
void allTenantEntitiesMustHaveFilter() {
    Reflections reflections = new Reflections("DoAn.BE");
    Set<Class<?>> entities = reflections.getTypesAnnotatedWith(Entity.class);
    
    // Entities KHÔNG cần company filter (global)
    Set<Class<?>> globalEntities = Set.of(
        User.class, 
        Company.class, 
        CompanyMember.class,
        CompanySettings.class,
        RefreshToken.class
    );
    
    for (Class<?> entity : entities) {
        if (globalEntities.contains(entity)) continue;
        
        // Check @Filter annotation
        boolean hasFilter = entity.isAnnotationPresent(Filter.class) 
            || entity.getSuperclass().isAnnotationPresent(Filter.class);
        
        if (!hasFilter) {
            fail("🚨 SECURITY: Entity " + entity.getSimpleName() 
                + " thiếu @Filter! Có thể gây lộ dữ liệu chéo công ty.");
        }
        
        // Check company field
        boolean hasCompany = hasField(entity, "company") 
            || TenantScopedEntity.class.isAssignableFrom(entity);
        
        if (!hasCompany) {
            fail("🚨 SECURITY: Entity " + entity.getSimpleName() 
                + " thiếu quan hệ với Company!");
        }
    }
}
```

**Thêm vào CI/CD:** Test này chạy mỗi khi build → Fail ngay nếu có entity mới không an toàn.

---

### FA-2: Cache Key Safety

**Vấn đề:** Cache không có companyId → Công ty A thấy cache của công ty B

**Giải pháp: Luôn kèm companyId trong cache key**

```java
// ❌ SAI - Key chỉ có id
@Cacheable(value = "employees", key = "#employeeId")

// ✅ ĐÚNG - Key có companyId
@Cacheable(value = "employees", key = "T(DoAn.BE.common.TenantContext).getCompanyId() + '_' + #employeeId")

// ✅ BETTER - Dùng SpEL helper
@Cacheable(value = "employees", key = "@cacheKeyGenerator.tenantKey(#employeeId)")

@Component
public class CacheKeyGenerator {
    public String tenantKey(Long id) {
        return TenantContext.getCompanyId() + "_" + id;
    }
    
    public String tenantKey(String prefix, Long id) {
        return TenantContext.getCompanyId() + "_" + prefix + "_" + id;
    }
}
```

---

### FA-3: Public Assets (Logo, Avatar)

**Vấn đề:** Logo công ty cần hiển thị ở trang Login (chưa có TenantContext)

**Giải pháp: Thêm flag `isPublic` cho File**

```java
@Entity
public class File extends TenantScopedEntity {
    // ... existing fields
    
    private boolean isPublic = false; // Mặc định: private
    
    // Logo, Avatar: isPublic = true
    // Salary docs: isPublic = false
}

// Download logic
public File downloadFile(Long fileId, Long userId) {
    File file = fileRepository.findById(fileId).orElseThrow();
    
    // Public files: No tenant check
    if (file.isPublic()) {
        return file;
    }
    
    // Private files: Full tenant + owner check
    Long companyId = TenantContext.getCompanyId();
    if (!file.getCompany().getCompanyId().equals(companyId)) {
        throw new ForbiddenException("Access denied");
    }
    
    // Personal file check
    if (file.getOwner() != null && !file.getOwner().getUserId().equals(userId)) {
        throw new ForbiddenException("Access denied to personal file");
    }
    
    return file;
}
```

---

### FA-4: User Invite Flow

**Vấn đề:** Mời user chưa có tài khoản → Logic không rõ ràng

**Giải pháp: 2 luồng xử lý**

```java
@Service
public class InviteService {
    
    public void inviteUser(Long companyId, String email, CompanyRole role) {
        Optional<User> existingUser = userRepository.findByEmail(email);
        
        if (existingUser.isPresent()) {
            // Case 1: User đã tồn tại
            handleExistingUser(companyId, existingUser.get(), role);
        } else {
            // Case 2: User chưa có tài khoản
            handleNewUser(companyId, email, role);
        }
    }
    
    private void handleExistingUser(Long companyId, User user, CompanyRole role) {
        // Check nếu đã là member
        if (memberRepository.existsByUserAndCompanyId(user, companyId)) {
            throw new BadRequestException("User đã là thành viên công ty");
        }
        
        // Tạo CompanyMember ngay
        CompanyMember member = new CompanyMember();
        member.setUser(user);
        member.setCompany(companyRepository.findById(companyId).orElseThrow());
        member.setRole(role);
        member.setPermissions(roleTemplateService.getTemplate(role));
        member.setInvitedAt(LocalDateTime.now());
        member.setIsActive(true);
        memberRepository.save(member);
        
        // Gửi notification
        notificationService.sendCompanyInviteNotification(user, company);
    }
    
    private void handleNewUser(Long companyId, String email, CompanyRole role) {
        // Tạo User ở trạng thái PENDING
        User newUser = new User();
        newUser.setEmail(email);
        newUser.setStatus(UserStatus.PENDING_ACTIVATION);
        newUser.setActivationToken(UUID.randomUUID().toString());
        userRepository.save(newUser);
        
        // Tạo CompanyMember (pending)
        CompanyMember member = new CompanyMember();
        member.setUser(newUser);
        member.setCompany(companyRepository.findById(companyId).orElseThrow());
        member.setRole(role);
        member.setPermissions(roleTemplateService.getTemplate(role));
        member.setInvitedAt(LocalDateTime.now());
        member.setIsActive(false); // Chờ user activate
        memberRepository.save(member);
        
        // Gửi email với link kích hoạt
        emailService.sendActivationEmail(email, newUser.getActivationToken(), company);
    }
}

// Activation endpoint
@PostMapping("/api/auth/activate")
public ResponseEntity<?> activateAccount(
        @RequestParam String token,
        @RequestBody ActivationRequest request) {
    
    User user = userRepository.findByActivationToken(token)
        .orElseThrow(() -> new BadRequestException("Invalid token"));
    
    // Set password và activate
    user.setPassword(passwordEncoder.encode(request.getPassword()));
    user.setFullName(request.getFullName());
    user.setStatus(UserStatus.ACTIVE);
    user.setActivationToken(null);
    userRepository.save(user);
    
    // Activate all pending memberships
    memberRepository.activateByUser(user);
    
    return ResponseEntity.ok("Account activated");
}
```

---

## ⚠️ Phase 0: Risk Mitigation (QUAN TRỌNG)

> [!CAUTION]
> Phần này PHẢI implement trước khi deploy. Đây là các rủi ro bảo mật nghiêm trọng.

### R1: Data Leakage Prevention (Hibernate Filter)

**Vấn đề:** Developer quên thêm `WHERE company_id = ?` → Công ty A thấy data công ty B.

**Giải pháp:** Sử dụng `@Filter` của Hibernate để TỰ ĐỘNG thêm điều kiện.

#### [NEW] TenantFilter Configuration

```java
// 1. Define filter on Entity
@Entity
@Table(name = "nhan_vien")
@FilterDef(name = "tenantFilter", parameters = @ParamDef(name = "companyId", type = Long.class))
@Filter(name = "tenantFilter", condition = "company_id = :companyId")
public class NhanVien {
    @ManyToOne
    @JoinColumn(name = "company_id")
    private Company company;
    
    // ... other fields
}

// 2. Apply filter in interceptor
@Component
public class TenantFilterInterceptor implements HandlerInterceptor {
    
    @PersistenceContext
    private EntityManager entityManager;
    
    @Override
    public boolean preHandle(HttpServletRequest request, 
                            HttpServletResponse response, 
                            Object handler) {
        Long companyId = TenantContext.getCompanyId();
        
        if (companyId != null) {
            Session session = entityManager.unwrap(Session.class);
            session.enableFilter("tenantFilter")
                   .setParameter("companyId", companyId);
        }
        
        return true;
    }
    
    @Override
    public void afterCompletion(HttpServletRequest request, 
                               HttpServletResponse response,
                               Object handler, Exception ex) {
        // Clean up filter after request
        Session session = entityManager.unwrap(Session.class);
        session.disableFilter("tenantFilter");
    }
}
```

#### Áp dụng cho tất cả Entity có companyId

```java
// Base class for tenant-scoped entities
@MappedSuperclass
@FilterDef(name = "tenantFilter", parameters = @ParamDef(name = "companyId", type = Long.class))
@Filter(name = "tenantFilter", condition = "company_id = :companyId")
public abstract class TenantScopedEntity {
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;
    
    // Auto-set company on save
    @PrePersist
    protected void prePersist() {
        if (company == null && TenantContext.getCompanyId() != null) {
            // Auto-assign current tenant's company
            company = new Company();
            company.setCompanyId(TenantContext.getCompanyId());
        }
    }
}

// Extend for all tenant-scoped entities
@Entity
public class NhanVien extends TenantScopedEntity {
    // ... fields
}

@Entity
public class Project extends TenantScopedEntity {
    // ... fields
}

@Entity
public class PhongBan extends TenantScopedEntity {
    // ... fields
}
```

---

### R2: Legacy Data Migration

**Vấn đề:** Khi thêm cột `company_id NOT NULL`, database sẽ lỗi với data cũ.

**Giải pháp:**

```sql
-- Migration Script V1__create_legacy_company.sql

-- 1. Create legacy company
INSERT INTO companies (name, slug, plan, is_active, created_at)
VALUES ('Legacy Company', 'legacy', 'ENTERPRISE', true, NOW());

SET @legacy_company_id = LAST_INSERT_ID();

-- 2. Create company settings
INSERT INTO company_settings (company_id, hr_module_enabled, project_module_enabled, 
                              chat_module_enabled, ai_module_enabled, storage_module_enabled)
VALUES (@legacy_company_id, true, true, true, true, true);

-- 3. Migrate existing users to legacy company
INSERT INTO company_members (user_id, company_id, role, is_active, joined_at)
SELECT user_id, @legacy_company_id, role, is_active, NOW()
FROM users
WHERE role IS NOT NULL;

-- 4. Add company_id to existing tables (with default value first)
ALTER TABLE nhan_vien ADD COLUMN company_id BIGINT;
UPDATE nhan_vien SET company_id = @legacy_company_id;
ALTER TABLE nhan_vien MODIFY company_id BIGINT NOT NULL;
ALTER TABLE nhan_vien ADD FOREIGN KEY (company_id) REFERENCES companies(company_id);

-- Repeat for: phong_ban, chuc_vu, projects, chat_rooms, files, folders
```

---

### R3: Global Resources Handling

**Vấn đề:** `IssueStatus`, `ChucVu`, `LoaiNghiPhep` - dùng chung hay riêng?

| Resource | Decision | Reason |
|----------|----------|--------|
| `IssueStatus` | **Per Company** | Mỗi công ty có workflow khác nhau |
| `ChucVu` | **Per Company** | Mỗi công ty có chức vụ riêng |
| `PhongBan` | **Per Company** | Obvious |
| `LoaiNghiPhep` | **Template + Custom** | Có sẵn template, company có thể thêm |
| `AttendanceStatus` | **Global (Locked)** | DI_TRE, VE_SOM, DU_GIO là chuẩn |

**Template Pattern cho LoaiNghiPhep:**

```java
@Entity
public class LeaveType {
    @Id @GeneratedValue
    private Long id;
    
    private String name; // "Annual", "Sick", "Personal"
    
    @ManyToOne
    private Company company; // NULL = global template
    
    private boolean isSystemDefault = false; // Cannot delete if true
    
    private int defaultDaysPerYear = 12;
}

// On company creation, copy templates
public void initializeCompanyDefaults(Company company) {
    List<LeaveType> templates = leaveTypeRepository.findByCompanyIsNull();
    for (LeaveType template : templates) {
        LeaveType copy = new LeaveType();
        copy.setName(template.getName());
        copy.setCompany(company);
        copy.setIsSystemDefault(true);
        copy.setDefaultDaysPerYear(template.getDefaultDaysPerYear());
        leaveTypeRepository.save(copy);
    }
}
```

---

### R4: File/Folder Security (CRITICAL FIX)

**Vấn đề trong plan cũ:** File và Folder được note là "Optional" → SAI!

**Fix:** File và Folder **PHẢI có companyId** để tránh lộ file lương.

```java
@Entity
public class File extends TenantScopedEntity { // REQUIRED, not optional!
    // ... existing fields
    
    // Every file MUST belong to a company (except personal files)
    // For personal files: company = user's "personal workspace" (auto-created)
}
```

---

### R5: Mobile Onboarding Flow

**Vấn đề:** User mới login, chưa thuộc công ty nào → hiển thị gì?

**Solution:**

```dart
// After login, check user's companies
if (user.companies.isEmpty) {
  // Show onboarding screen
  Navigator.push(context, MaterialPageRoute(
    builder: (_) => OnboardingScreen(
      options: [
        OnboardingOption(
          icon: Icons.add_business,
          title: "Tạo công ty mới",
          subtitle: "Bạn là chủ doanh nghiệp",
          onTap: () => Navigator.push(context, CreateCompanyScreen()),
        ),
        OnboardingOption(
          icon: Icons.group_add,
          title: "Nhập mã mời",
          subtitle: "Bạn được mời vào công ty",
          onTap: () => Navigator.push(context, JoinCompanyScreen()),
        ),
        OnboardingOption(
          icon: Icons.explore,
          title: "Dùng thử cá nhân",
          subtitle: "Tạo workspace riêng để khám phá",
          onTap: () => createPersonalWorkspace(),
        ),
      ],
    ),
  ));
} else if (user.companies.length == 1) {
  // Auto-select single company
  await switchCompany(user.companies.first.companyId);
} else {
  // Show company selector
  Navigator.push(context, CompanySelectorScreen());
}
```

---

## � Phase 0.5: Advanced Security & Performance (CRITICAL)

> [!CAUTION]
> Các vấn đề này có thể dẫn đến lộ dữ liệu nghiêm trọng nếu không xử lý!

### S1: Native Query Bypass Prevention

**Vấn đề:** Hibernate Filter **KHÔNG** hoạt động với `@Query(nativeQuery = true)`.

**Giải pháp:**

```java
// ❌ TUYỆT ĐỐI KHÔNG được làm
@Query(value = "SELECT * FROM nhan_vien WHERE ...", nativeQuery = true)
List<NhanVien> findCustom(...);

// ✅ Nếu BẮT BUỘC phải dùng Native Query
@Query(value = "SELECT * FROM nhan_vien WHERE company_id = :companyId AND ...", 
       nativeQuery = true)
List<NhanVien> findCustom(@Param("companyId") Long companyId, ...);

// Usage: luôn truyền TenantContext.getCompanyId()
```

**Team Rule:** Cấm Native Query trừ khi có Tech Lead approval.

---

### S2: Async/Scheduled Context Propagation

**Vấn đề:** `ThreadLocal` không tự động copy sang `@Async` threads.

**Giải pháp: TaskDecorator**

```java
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {
    
    @Override
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(10);
        executor.setTaskDecorator(new TenantAwareTaskDecorator());
        executor.initialize();
        return executor;
    }
}

public class TenantAwareTaskDecorator implements TaskDecorator {
    
    @Override
    public Runnable decorate(Runnable runnable) {
        // Capture context from main thread
        Long companyId = TenantContext.getCompanyId();
        CompanyMember member = TenantContext.getMembership();
        
        return () -> {
            try {
                // Set context in async thread
                TenantContext.setCompanyId(companyId);
                TenantContext.setMembership(member);
                runnable.run();
            } finally {
                // Clean up
                TenantContext.clear();
            }
        };
    }
}
```

**Cho @Scheduled Jobs:** Phải truyền companyId explicitly.

```java
@Scheduled(cron = "0 0 2 * * *") // 2 AM daily
public void processAllCompanies() {
    List<Company> companies = companyRepository.findAllActive();
    for (Company company : companies) {
        TenantContext.setCompanyId(company.getCompanyId());
        try {
            processForCompany(company);
        } finally {
            TenantContext.clear();
        }
    }
}
```

---

### S3: IDOR Prevention in File Download

**Vấn đề:** `GET /api/storage/files/{fileId}/download` - hacker đoán ID file công ty khác.

**Giải pháp:**

```java
// ❌ SAI - Chỉ check fileId
public File downloadFile(Long fileId) {
    return fileRepository.findById(fileId).orElseThrow();
}

// ✅ ĐÚNG - Luôn kèm companyId
public File downloadFile(Long fileId, Long userId) {
    Long companyId = TenantContext.getCompanyId();
    
    File file = fileRepository.findByFileIdAndCompanyId(fileId, companyId)
        .orElseThrow(() -> new ForbiddenException("File not found or access denied"));
    
    // Additional check: personal file must belong to user
    if (file.getOwner() != null && !file.getOwner().getUserId().equals(userId)) {
        throw new ForbiddenException("Access denied to personal file");
    }
    
    return file;
}
```

---

### P1: Composite Index for Performance

**Vấn đề:** Query chậm khi data lớn nếu chỉ index riêng lẻ.

**Giải pháp: Migration Script**

```sql
-- V2__add_composite_indexes.sql

-- Bảng ChamCong (query thường xuyên nhất)
CREATE INDEX idx_chamcong_company_nhanvien_date 
ON cham_cong (company_id, nhan_vien_id, ngay_cham);

-- Bảng BangLuong
CREATE INDEX idx_bangluong_company_period 
ON bang_luong (company_id, nam, thang);

-- Bảng Message (chat sẽ rất lớn)
CREATE INDEX idx_message_room_time 
ON messages (chat_room_id, sent_at);

-- Bảng Notification
CREATE INDEX idx_notification_user_read 
ON notifications (user_id, is_read, created_at);

-- Bảng Issue
CREATE INDEX idx_issue_project_sprint 
ON issues (project_id, sprint_id, issue_status_id);
```

**Nguyên tắc:** `company_id` luôn đứng đầu composite index.

---

### P2: Noisy Neighbor Mitigation (Rate Limiting)

**Vấn đề:** Công ty lớn chiếm hết resources → công ty nhỏ không dùng được.

**Giải pháp: Bucket4j Rate Limiting**

```java
@Component
public class TenantRateLimiter {
    
    private final Map<Long, Bucket> buckets = new ConcurrentHashMap<>();
    
    public boolean tryConsume(Long companyId, Plan plan) {
        Bucket bucket = buckets.computeIfAbsent(companyId, 
            id -> createBucket(plan));
        return bucket.tryConsume(1);
    }
    
    private Bucket createBucket(Plan plan) {
        long requestsPerMinute = switch(plan) {
            case FREE -> 100;
            case PRO -> 1000;
            case ENTERPRISE -> 10000;
        };
        
        return Bucket.builder()
            .addLimit(Bandwidth.classic(requestsPerMinute, 
                Refill.intervally(requestsPerMinute, Duration.ofMinutes(1))))
            .build();
    }
}

// In Controller/Interceptor
@PreAuthorize("@tenantRateLimiter.tryConsume(#companyId, @company.plan)")
```

---

### P3: CompanySettings Optimization (Cache)

**Vấn đề:** Check feature flag mỗi request → query nhiều.

**Giải pháp: Gộp vào Company hoặc dùng Cache**

```java
// Option A: Gộp settings vào Company (recommend)
@Entity
public class Company {
    // ... other fields
    
    // Settings embedded as JSON
    @Column(columnDefinition = "JSON")
    @Convert(converter = CompanySettingsConverter.class)
    private CompanySettings settings;
}

// Option B: Cache (nếu giữ bảng riêng)
@Service
public class FeatureService {
    
    @Cacheable(value = "companySettings", key = "#companyId")
    public CompanySettings getSettings(Long companyId) {
        return settingsRepository.findByCompanyId(companyId);
    }
    
    @CacheEvict(value = "companySettings", key = "#companyId")
    public void updateSettings(Long companyId, CompanySettings settings) {
        settingsRepository.save(settings);
    }
}
```

---

## 📋 FINAL Checklist

### Phase 0: Risk Mitigation ⚠️
- [ ] Implement TenantScopedEntity base class
- [ ] Add @Filter to all entities
- [ ] TenantFilterInterceptor
- [ ] Legacy data migration script
- [ ] Global resources decision (ChucVu, LeaveType...)
- [ ] File/Folder security fix
- [ ] Mobile onboarding flow design

### Phase 0.5: Advanced Security 🔒
- [ ] **S1:** Ban Native Query rule + Code review
- [ ] **S2:** TenantAwareTaskDecorator for @Async
- [ ] **S2:** Explicit companyId for @Scheduled jobs
- [ ] **S3:** IDOR prevention in FileService.download()
- [ ] **P1:** Composite indexes migration script
- [ ] **P2:** Bucket4j Rate Limiting per company
- [ ] **P3:** CompanySettings caching strategy

### Xử lý Warning.md trong rebuild
- [ ] WARN-003: Merge UserController + AccountController
- [ ] WARN-001: Tách DataSeed thành module-specific seeds
- [ ] WARN-004/006: Xóa tất cả duplicate getCurrentUser()

### Migration Safety
- [ ] Run migration during off-peak hours (đêm)
- [ ] Backup database before ALTER TABLE
- [ ] Test on staging environment first


