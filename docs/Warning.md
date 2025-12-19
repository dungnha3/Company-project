# ⚠️ Code Review - Warning & Issues Tracking

> **Mục đích**: Tổng hợp các vấn đề phát hiện trong quá trình review từng module
> **Cập nhật**: 2025-12-19

---

## 🚀 MAJOR DECISION: Multi-tenant SaaS Rebuild

> [!IMPORTANT]
> **Quyết định:** Rebuild hệ thống thành Multi-tenant SaaS
> 
> **Xem chi tiết:** [Implementation Plan](file:///c:/DACN/docs/multitenant_plan.md)

| Aspect | Decision |
|--------|----------|
| **Architecture** | Multi-tenant SaaS |
| **User Flow** | Tạo account → Full features → Join company → Admin controls |
| **Tech Stack** | Giữ Spring Boot + Java (có code cũ) |
| **Estimated Time** | 10-16 ngày |
| **Priority Fixes** | Google OAuth, Permission System, Data Isolation |

---

## 📊 Tổng Quan

| Module | Reviewed | Issues | Critical | Warning | Info |
|--------|----------|--------|----------|---------|------|
| `common/` | ✅ | 2 | 0 | 2 | 0 |
| `user/` | ✅ | 3 | 0 | 2 | 1 |
| `auth/` | ✅ | 3 | 1 | 1 | 1 |
| `hr/` | ✅ | 2 | 0 | 1 | 1 |
| `project/` | ✅ | 1 | 0 | 0 | 1 |
| `chat/` | ✅ | 2 | 0 | 0 | 2 |
| `notification/` | ✅ | 1 | 0 | 0 | 1 |
| `storage/` | ✅ | 2 | 0 | 0 | 2 |
| `ai/` | ✅ | 1 | 0 | 0 | 1 |
| `audit/` | ✅ | 1 | 0 | 0 | 1 |

---

## 📦 Module: common

### ⚠️ WARN-001: DataSeed.java quá lớn (1208 dòng)

| Thuộc tính | Giá trị |
|------------|---------|
| **File** | [DataSeed.java](file:///c:/DACN/BE/BE/src/main/java/DoAn/BE/common/config/DataSeed.java) |
| **Severity** | ⚠️ Warning |
| **Priority** | 🟡 Thấp (không ảnh hưởng production) |
| **Effort** | ~3 giờ |
| **Status** | 🔴 Chưa sửa |

**Vấn đề cụ thể:**
- 1 file chứa seed data cho 5 modules khác nhau
- Khó tìm và sửa khi cần update test data
- Vi phạm Single Responsibility Principle

**Impact nếu sửa:**
| Aspect | Before | After |
|--------|--------|-------|
| Maintainability | ❌ Khó tìm code | ✅ Dễ navigate |
| Performance | Không đổi | Không đổi |
| Security | Không đổi | Không đổi |

**Đề xuất chi tiết:**

1. Tạo thư mục mới:
```
common/config/seed/
```

2. Tách thành 5 files với `@Order` annotation:
```java
// HRDataSeed.java
@Component
@Order(1) // Chạy đầu tiên vì các module khác depend vào
public class HRDataSeed implements CommandLineRunner {
    @Override
    public void run(String... args) {
        if (nhanVienRepository.count() == 0) {
            seedPhongBan();
            seedChucVu();
            seedNhanVien();
            // ... copy từ seedHRModule()
        }
    }
}
```

3. Xóa các methods trong DataSeed.java, giữ lại structure

**Nên làm không?** ❌ **KHÔNG ưu tiên** - Chỉ là code cleanliness, không ảnh hưởng functionality.

---

### ⚠️ WARN-002: GlobalExceptionHandler duplicate pattern

| Thuộc tính | Giá trị |
|------------|---------|
| **File** | [GlobalExceptionHandler.java](file:///c:/DACN/BE/BE/src/main/java/DoAn/BE/common/exception/GlobalExceptionHandler.java) |
| **Severity** | ⚠️ Warning (Minor) |
| **Priority** | 🟢 Rất thấp |
| **Effort** | ~30 phút |
| **Status** | 🔴 Chưa sửa |

**Vấn đề cụ thể:**
12 handler methods có cùng pattern:
```java
// Lặp lại 12 lần với chỉ status code khác nhau
ErrorResponse error = new ErrorResponse(ex.getMessage(), HttpStatus.XXX.value());
return ResponseEntity.status(HttpStatus.XXX).body(error);
```

**Impact nếu sửa:**
| Aspect | Before | After |
|--------|--------|-------|
| Code lines | 158 dòng | ~120 dòng (-38 dòng) |
| Maintainability | OK | Tốt hơn chút |
| Performance | Không đổi | Không đổi |

**Đề xuất chi tiết:**

1. Thêm helper method:
```java
// Thêm vào đầu class
private ResponseEntity<ErrorResponse> error(String message, HttpStatus status) {
    return ResponseEntity.status(status)
        .body(new ErrorResponse(message, status.value()));
}
```

2. Refactor các handlers:
```java
// Trước:
@ExceptionHandler(BadRequestException.class)
public ResponseEntity<ErrorResponse> handleBadRequest(BadRequestException ex) {
    ErrorResponse error = new ErrorResponse(ex.getMessage(), HttpStatus.BAD_REQUEST.value());
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
}

// Sau:
@ExceptionHandler(BadRequestException.class)
public ResponseEntity<ErrorResponse> handleBadRequest(BadRequestException ex) {
    return error(ex.getMessage(), HttpStatus.BAD_REQUEST);
}
```

**Nên làm không?** ❌ **KHÔNG ưu tiên** - Chỉ giảm 38 dòng, không đáng effort.

---

## 📦 Module: user

### ⚠️ WARN-003: UserController và AccountController chức năng trùng lặp

| Thuộc tính | Giá trị |
|------------|---------|
| **Files** | [UserController.java](file:///c:/DACN/BE/BE/src/main/java/DoAn/BE/user/controller/UserController.java), [AccountController.java](file:///c:/DACN/BE/BE/src/main/java/DoAn/BE/user/controller/AccountController.java) |
| **Severity** | ⚠️ Warning |
| **Priority** | 🟡 Trung bình (confusing API design) |
| **Effort** | ~4 giờ |
| **Status** | 🔴 Chưa sửa |

**Vấn đề cụ thể:**
- 2 controllers phục vụ cùng entity `User`
- Mobile dev không biết gọi endpoint nào
- Duplicate business logic trong 2 nơi

**Endpoints trùng lặp:**
| Chức năng | UserController | AccountController |
|-----------|----------------|-------------------|
| List users | `GET /api/users` | `GET /api/accounts` |
| Delete | `DELETE /api/users/{id}` | `DELETE /api/accounts/{id}` |
| Search | `GET /api/users/search` | `GET /api/accounts/search` |

**Impact nếu sửa:**
| Aspect | Before | After |
|--------|--------|-------|
| API Clarity | ❌ 2 endpoints cho 1 việc | ✅ 1 endpoint rõ ràng |
| Code Duplication | ❌ Logic 2 nơi | ✅ Logic 1 nơi |
| Mobile Dev Experience | ❌ Confusing | ✅ Clear |

**Đề xuất chi tiết:**

**Option A - Gộp vào AccountController (Khuyến nghị):**
```
/api/accounts           → CRUD accounts (Admin + HR)
/api/accounts/with-employee → Tạo account + nhân viên (HR)
/api/users              → XÓA BỎ
```

**Option B - Phân tách rõ ràng:**
```
/api/admin/users        → Admin quản lý system users
/api/accounts           → HR quản lý business accounts
```

**Breaking Changes:** ⚠️ Mobile app cần update nếu đang dùng `/api/users`

**Nên làm không?** ⚠️ **NÊN LÀM** - Giảm confusion cho dev team, nhưng cần coordinate với Mobile.

---

### ⚠️ WARN-004: Duplicate getCurrentUser() pattern

| Thuộc tính | Giá trị |
|------------|---------|
| **File** | [AccountController.java](file:///c:/DACN/BE/BE/src/main/java/DoAn/BE/user/controller/AccountController.java#L38-L41) |
| **Severity** | ⚠️ Warning (Minor) |
| **Priority** | 🟢 Thấp |
| **Effort** | ~15 phút |
| **Status** | 🔴 Chưa sửa |

**Vấn đề cụ thể:**
- AccountController tự implement `getCurrentUser()` (line 38-41)
- Đã có `SecurityUtil.getCurrentUser()` sẵn
- ProfileController đã dùng đúng cách

**Code hiện tại:**
```java
// AccountController.java - KHÔNG NÊN
private User getCurrentUser() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    return (User) auth.getPrincipal();
}
```

**Đề xuất chi tiết:**

1. Xóa method `getCurrentUser()` trong AccountController
2. Thay tất cả `getCurrentUser()` bằng `SecurityUtil.getCurrentUser()`

```java
// Trước:
User currentUser = getCurrentUser();

// Sau:
User currentUser = SecurityUtil.getCurrentUser();
```

**Impact nếu sửa:**
| Aspect | Before | After |
|--------|--------|-------|
| Code duplication | ❌ 2 nơi | ✅ 1 nơi |
| Consistency | ❌ Khác nhau | ✅ Thống nhất |

**Nên làm không?** ✅ **NÊN LÀM** - Quick fix, ít risk, improve consistency.

---

### ℹ️ INFO-001: UserService.updateUser() có 2 overloads

| Thuộc tính | Giá trị |
|------------|---------|
| **File** | [UserService.java](file:///c:/DACN/BE/BE/src/main/java/DoAn/BE/user/service/UserService.java) |
| **Severity** | ℹ️ Info |
| **Priority** | 🟢 Rất thấp |
| **Effort** | ~1 giờ |
| **Status** | 🔴 Chưa sửa |

**Vấn đề cụ thể:**
2 methods cùng tên với logic tương tự:

| Method | Line | Caller |
|--------|------|--------|
| `updateUser(Long, UpdateUserRequest)` | 157 | UserController (cũ) |
| `updateUser(Long, UserDTO, User)` | 360 | AccountController (mới) |

**Impact nếu sửa:**
| Aspect | Before | After |
|--------|--------|-------|
| API Compatibility | ✅ Backwards compatible | ⚠️ Có thể break |
| Code clarity | ❌ 2 methods tương tự | ✅ 1 method |

**Đề xuất chi tiết:**

**Option A - Giữ nguyên (Khuyến nghị):**
- 2 overloads có purpose khác nhau
- Không break existing callers
- Java cho phép method overloading

**Option B - Gộp nếu muốn:**
```java
// Tạo 1 method internal, 2 public methods đều gọi nó
private User updateUserInternal(Long id, String username, String email, 
    String phone, String avatar, User.Role role, User currentUser) {
    // Logic chung
}
```

**Nên làm không?** ❌ **KHÔNG CẦN** - Method overloading là pattern hợp lệ trong Java.

---

## 📦 Module: auth

### 🔴 CRITICAL-001: Chưa hỗ trợ Google OAuth (Yêu cầu nghiệp vụ)

| Thuộc tính | Giá trị |
|------------|---------|
| **Files** | [AuthService.java](file:///c:/DACN/BE/BE/src/main/java/DoAn/BE/auth/service/AuthService.java), [AuthController.java](file:///c:/DACN/BE/BE/src/main/java/DoAn/BE/auth/controller/AuthController.java) |
| **Severity** | 🔴 Critical (Business Requirement) |
| **Priority** | 🔴 Cao |
| **Effort** | ~3-4 ngày |
| **Status** | 🔴 Chưa sửa |

**Vấn đề cụ thể:**
- Hiện tại chỉ hỗ trợ username/password login
- Không có Google OAuth integration
- User phải tự tạo password → security risk
- Không thể invite user qua email

**Impact nếu sửa:**
| Aspect | Before | After |
|--------|--------|-------|
| User Experience | ❌ Nhớ thêm password | ✅ Click Google is login |
| Security | ⚠️ Weak passwords | ✅ Google handles auth |
| Onboarding | ❌ HR tạo manual | ✅ Email invite flow |

**Đề xuất chi tiết:**

1. Thêm dependencies:
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-oauth2-client</artifactId>
</dependency>
```

2. Tạo GoogleAuthController:
```java
@RestController
@RequestMapping("/api/auth/google")
public class GoogleAuthController {
    @PostMapping("/callback")
    public AuthResponse googleCallback(@RequestBody GoogleTokenRequest request) {
        // 1. Verify Google token
        // 2. Find or create user by email
        // 3. Return JWT tokens
    }
}
```

3. Giữ nguyên login cũ cho backwards compatibility

**Nên làm không?** ✅ **NÊN LÀM** - Business requirement đã thảo luận.

---

### ⚠️ WARN-005: Register function bị disabled nhưng code vẫn còn

| Thuộc tính | Giá trị |
|------------|---------|
| **Files** | [AuthController.java:29](file:///c:/DACN/BE/BE/src/main/java/DoAn/BE/auth/controller/AuthController.java#L29), [AuthService.java:49](file:///c:/DACN/BE/BE/src/main/java/DoAn/BE/auth/service/AuthService.java#L49) |
| **Severity** | ⚠️ Warning |
| **Priority** | 🟢 Thấp |
| **Effort** | ~30 phút |
| **Status** | 🔴 Chưa sửa |

**Vấn đề cụ thể:**
- Comment "Chức năng đăng ký đã bị vô hiệu hóa" ở 2 file
- Nhưng không có code register nào (đã xóa)
- Comment gây confuse cho dev mới

**Đề xuất:**
- Xóa comment hoặc thêm documentation rõ ràng hơn
- Nếu cần register trong tương lai (Google OAuth), cần implement lại

**Nên làm không?** ❌ **KHÔNG ưu tiên** - Chỉ là cleanup comment.

---

### ℹ️ INFO-002: Auth module đã có các tính năng bảo mật tốt

| Thuộc tính | Giá trị |
|------------|---------|
| **Files** | All auth files |
| **Severity** | ℹ️ Info (Positive) |
| **Status** | ✅ Đã có |

**Các tính năng bảo mật đã implement:**

| Feature | Status | Code location |
|---------|--------|---------------|
| Brute force protection | ✅ | AuthService:34-35 (5 attempts, 15min lockout) |
| Refresh token rotation | ✅ | AuthService:137-139 |
| Session tracking | ✅ | SessionService |
| Login attempt logging | ✅ | LoginAttemptRepository |
| Security alert notifications | ✅ | AuthService:67-73, 191-198, 228-239 |
| IP address tracking | ✅ | AuthController:119-130 |

**Ghi chú:** Module auth đã implement tốt các best practices. Không cần sửa gì về security.

---

## 📦 Module: hr

### ℹ️ INFO-003: HR Module đã implement tốt các nghiệp vụ phức tạp

| Thuộc tính | Giá trị |
|------------|---------|
| **Files** | 11 controllers, 12 services, 8 entities |
| **Severity** | ℹ️ Info (Positive) |
| **Status** | ✅ Đã có |

**Các tính năng nghiệp vụ đã implement tốt:**

| Feature | Status | Code location |
|---------|--------|---------------|
| Salary Masking | ✅ | BangLuongService (HR không xem được lương) |
| 2-Step Leave Approval | ✅ | NghiPhepService:approvePM(), approveAccounting() |
| GPS Check-in | ✅ | ChamCongService:chamCongGPS() (Haversine formula) |
| Auto Salary Calculation | ✅ | BangLuongService:tinhLuongTuDong() (BHXH, thuế TNCN) |
| Permission per method | ✅ | Mỗi method có comment quyền truy cập |
| Workflow Notifications | ✅ | WorkflowNotificationService |

---

### ⚠️ WARN-006: Duplicate getCurrentUser() pattern trong HR Controllers

| Thuộc tính | Giá trị |
|------------|---------|
| **Files** | ChamCongController, NghiPhepController, BangLuongController |
| **Severity** | ⚠️ Warning (Minor) |
| **Priority** | 🟢 Thấp |
| **Effort** | ~30 phút |
| **Status** | 🔴 Chưa sửa |

**Vấn đề:** Giống WARN-004 - nhiều controller tự implement getCurrentUser() thay vì dùng SecurityUtil.

**Đề xuất:** Refactor tất cả sang `SecurityUtil.getCurrentUser()`.

**Nên làm không?** ⚠️ NÊN làm cùng lúc với WARN-004 khi có thời gian.

---

## � Module: project

### ℹ️ INFO-004: Project Module đã implement tốt Agile/Scrum workflow

| Thuộc tính | Giá trị |
|------------|---------|
| **Files** | 6 controllers, 10 services, 7 entities |
| **Severity** | ℹ️ Info (Positive) |
| **Status** | ✅ Đã có |

**Các tính năng đã implement tốt:**

| Feature | Status | Code location |
|---------|--------|---------------|
| Project Access Validation | ✅ | ProjectService:validateProjectAccess() |
| Project Role hierarchy | ✅ | OWNER > MANAGER > MEMBER |
| Auto Issue Key generation | ✅ | IssueService:generateIssueKey() |
| Chat Integration | ✅ | ProjectChatIntegrationService |
| Burndown Chart | ✅ | ProjectDashboardService |
| Sprint Scheduling | ✅ | SprintScheduledService |
| Issue Overdue Check | ✅ | IssueScheduledService |

**Ghi chú:** gemini.md PROJECT section chính xác với code. Không cần update.

---

## 📦 Module: chat

### ℹ️ INFO-005: Chat Module đã implement đầy đủ real-time messaging

| Thuộc tính | Giá trị |
|------------|--------|
| **Files** | 7 controllers, 7 services, 8 entities, 6 websocket files |
| **Severity** | ℹ️ Info (Positive) |
| **Status** | ✅ Đã có |

**Các tính năng đã implement:**

| Feature | Status | Code location |
|---------|--------|---------------|
| WebSocket STOMP | ✅ | websocket/config, handler |
| Room types (DIRECT/GROUP/PROJECT) | ✅ | ChatRoomService |
| File/Image upload | ✅ | FileService |
| Typing indicator | ✅ | TypingIndicatorService |
| User presence (online/offline) | ✅ | UserPresenceService |
| Message mentions (@user, @TASK) | ✅ | MessageService:processMentions() |
| Read receipts | ✅ | MessageStatusService |
| Message search | ✅ | MessageService (keyword, sender, date, type) |

---

### 💡 SUGGEST-001: Tính năng có thể bổ sung cho Chat

| Thuộc tính | Giá trị |
|------------|--------|
| **Severity** | ℹ️ Info (Suggestion) |
| **Priority** | 🟡 Tùy chọn |
| **Status** | ☐ Chưa có |

**Tính năng gợi ý bổ sung:**

| Feature | Priority | Effort | Mô tả |
|---------|----------|--------|-------|
| **Reactions** | 🟡 Medium | ~2 ngày | Emoji reactions cho messages (👍❤️😂) |
| **Message Pinning** | 🟢 Low | ~1 ngày | Ghim tin nhắn quan trọng |
| **Read Receipts List** | 🟢 Low | ~4 giờ | Xem danh sách ai đã đọc |
| **Voice Messages** | 🟡 Medium | ~3 ngày | Gửi tin nhắn thoại |
| **Message Forwarding** | 🟢 Low | ~4 giờ | Forward message sang room khác |

**Entity đề xuất cho Reactions:**
```java
@Entity
public class MessageReaction {
    @Id @GeneratedValue
    private Long id;
    
    @ManyToOne
    private Message message;
    
    @ManyToOne
    private User user;
    
    private String emoji; // "👍", "❤️", "😂"
    private LocalDateTime createdAt;
}
```

---

## 📦 Module: storage

### ℹ️ INFO-006: Storage Module đã implement đầy đủ file management

| Thuộc tính | Giá trị |
|------------|--------|
| **Files** | 6 services, 2 entities, 1 controller |
| **Severity** | ℹ️ Info (Positive) |
| **Status** | ✅ Đã có |

**Các tính năng đã implement:**

| Feature | Status | Code location |
|---------|--------|---------------|
| File upload/download | ✅ | FileStorageService |
| Storage quota (100MB/user) | ✅ | checkStorageQuota() |
| File versioning | ✅ | version, parentFile fields |
| Soft delete + Restore | ✅ | deleteFile(), restoreFile() |
| Project folder integration | ✅ | StorageProjectIntegrationService |
| Storage stats | ✅ | getStorageStats() |

---

### 💡 SUGGEST-002: Cloud Storage cho production

| Thuộc tính | Giá trị |
|------------|--------|
| **Severity** | ℹ️ Info (Suggestion) |
| **Priority** | 🟡 Khi deploy production |
| **Effort** | ~3-5 ngày |

**Hiện tại:** Lưu file local (`./uploads`)

**Đề xuất cho production:**
- AWS S3 hoặc Google Cloud Storage
- CDN cho file delivery
- Presigned URLs cho security

---

## 📦 Module: ai

### ℹ️ INFO-007: AI Module có tính năng AI Project Assistant mạnh mẽ

| Thuộc tính | Giá trị |
|------------|--------|
| **Files** | 5 services (103KB), 5 DTOs, 2 entities |
| **Severity** | ℹ️ Info (Positive) |
| **Status** | ✅ Đã có |

**Các tính năng AI đã implement:**

| Feature | Status | Code location |
|---------|--------|---------------|
| Gemini API Integration | ✅ | GeminiService |
| AI Action Parser | ✅ | AIActionParser (parse user intent) |
| Auto Project Setup | ✅ | setupProjectComplete() - Tạo project + tasks + members |
| Auto Task Creation | ✅ | createIssue(), createMultipleIssues() |
| Auto Task Assignment | ✅ | autoAssignTasks() |
| Sprint Management | ✅ | createSprint(), startSprint(), completeSprint() |
| Project Context | ✅ | ProjectContextService (AI hiểu context project) |

**Ví dụ sử dụng:**
> "Tạo dự án E-commerce với 5 task cho sprint 1, gán cho team"

AI sẽ tự động:
1. Tạo Project "E-commerce"
2. Tạo 5 Issues
3. Tạo Sprint 1
4. Gán tasks cho members

---

## 📦 Module: notification

### ℹ️ INFO-009: Notification có kiến trúc domain-specific tốt

| Thuộc tính | Giá trị |
|------------|--------|
| **Files** | 12 services (~65KB), 2 entities, 2 controllers |
| **Severity** | ℹ️ Info (Positive) |
| **Status** | ✅ Đã có |

**Các services theo domain:**

| Service | Chức năng |
|---------|----------|
| HRNotificationService | Thông báo HR |
| ProjectNotificationService | Thông báo Project (8KB) |
| ChatNotificationService | Thông báo Chat |
| AuthNotificationService | Thông báo Auth/Security |
| LeaveRequestNotificationService | Thông báo Nghỉ phép |
| AttendanceNotificationService | Thông báo Chấm công |
| StorageNotificationService | Thông báo Storage |
| EmailNotificationService | Gửi email (9KB) |
| FCMService | Firebase Cloud Messaging |
| NotificationCleanupService | Xóa thông báo cũ |

---

## 📦 Module: audit

### ℹ️ INFO-008: Audit Module có audit logging tốt

| Thuộc tính | Giá trị |
|------------|--------|
| **Files** | 1 service (167 lines), 1 entity, 1 controller |
| **Severity** | ℹ️ Info (Positive) |
| **Status** | ✅ Đã có |

**Các tính năng đã implement:**

| Feature | Status | Code location |
|---------|--------|---------------|
| Async Logging | ✅ | @Async - không block main thread |
| Action Logging | ✅ | logAction() - ghi lại thao tác |
| Failed Action Logging | ✅ | logFailedAction() |
| Critical Admin Actions | ✅ | logAdminActionOnManager() |
| IP/UserAgent Tracking | ✅ | Mỗi log có ipAddress, userAgent |
| Old/New Value JSON | ✅ | Ghi nhận giá trị trước/sau |

---

## 📋 Legend

| Icon | Meaning |
|------|---------|
| 🔴 | Chưa sửa |
| 🟡 | Đang sửa |
| 🟢 | Đã sửa |
| ❌ | Bỏ qua (không sửa) |

| Severity | Meaning |
|----------|---------|
| 🔴 Critical | Phải sửa ngay, ảnh hưởng production |
| ⚠️ Warning | Nên sửa, code smell hoặc maintainability |
| ℹ️ Info | Gợi ý cải tiến, không bắt buộc |
