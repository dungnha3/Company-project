# Gemini Backend - Quick Reference for AI Assistants

> **Purpose**: A concise summary of the system for AI assistants to read before working on the codebase.
> **Updated**: 2026-01-12

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (V2)                         │
│                     React + ZuStand + Vite                   │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API + WebSocket
┌──────────────────────────▼──────────────────────────────────┐
│                      BACKEND (Spring Boot)                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐ │
│  │ Controller │──│  Service   │──│   Repository (JPA)     │ │
│  └────────────┘  └─────┬──────┘  └────────────────────────┘ │
│                        │                                     │
│                 ┌──────▼──────┐                              │
│                 │ EventPublisher │ ──► InternalNotificationListener
│                 └─────────────┘        (Async, After Commit)  │
└──────────────────────────────────────────────────────────────┘
```

## Key Patterns

### 1. Multi-Tenancy
- **TenantContext**: ThreadLocal storing `companyId`
- **TenantFilter**: Hibernate filter auto-applies `company_id` to queries
- **TenantScopedEntity**: Base class with `company` FK

### 2. Event-Driven Notifications
- **ALL notifications** go through Events → `InternalNotificationListener`
- **Events**: `ProjectEvent`, `IssueEvent`, `SprintEvent`, `HrmEvent`, `AuthEvent`
- **Pattern**: Service publishes event, Listener handles notification asynchronously

```java
eventPublisher.publishEvent(new HrmEvent(this, Type.ATTENDANCE_LATE, timeStr, userId, "..."));
```

### 3. Security Layers
- JWT Authentication (Access + Refresh tokens)
- **Multi-Role Access**: `roles` Set per member (e.g., `[ADMIN, MONITOR]`)
- **Granular Permissions**: `PermissionService` checks Plan → Settings → UserPermissions
- Feature flags: `CompanySettings` controls module access
- Multi-tenant isolation: Company deactivation = immediate lockout

---

## Modules (Active)

| Module | Purpose | Key Services |
|--------|---------|--------------|
| `auth` | Login/Register, JWT, SSO | `AuthService`, `JwtService` |
| `user` | User CRUD, Profile | `UserService`, `UserSaasService` |
| `company` | Company CRUD, Members, Settings | `CompanyService`, `InviteService` |
| `hrm` | Employees, Attendance, Leave, Salary, Contracts | `EmployeeService`, `AttendanceService`, etc. |
| `project` | Projects, Sprints, Issues, Comments | `ProjectService`, `IssueService`, etc. |
| `chat` | Chat Rooms, Messages | `ChatRoomService`, `MessageService` |
| `storage` | File Upload/Download | `FileStorageService`, `FolderService` |
| `notification` | Bell Notifications, FCM Push | `NotificationService`, `FCMService` |
| `calendar` | Calendar Events, RSVP | `CalendarService` |
| `timetracking` | Time Logs for Issues | `TimeTrackingService` |
| `analytics` | Charts, Burndown, Velocity | `AnalyticsService` |
| `ai` | Gemini AI Integration | `GeminiService`, `AIProjectAssistantService` |
| `integration` | External Webhooks | `IntegrationService`, `WebhookConnector` |
| `audit` | Action Logging | `AuditLogService` |
| `workspace` | Personal + Company Workspace Switcher | `WorkspaceService` |

## Removed Modules
- ~~`automation`~~ - Deleted (was incomplete placeholder)

---

## Event Types

### HrmEvent.Type
```
EMPLOYEE_HIRED, EMPLOYEE_RESIGNED, LEAVE_REQUESTED, LEAVE_APPROVED, LEAVE_REJECTED,
CONTRACT_CREATED, CONTRACT_RENEWED, CONTRACT_EXPIRING,
ATTENDANCE_LATE, ATTENDANCE_FORGOT_CHECKOUT, CHECKOUT_REMINDER, MISSING_ATTENDANCE, MONTHLY_SUMMARY,
REVIEW_CREATED, REVIEW_APPROVED, SALARY_CALCULATED, SALARY_PAID
```

### AuthEvent.Type
```
LOGIN_NEW_DEVICE, PASSWORD_CHANGED, ACCOUNT_LOCKED, PASSWORD_RESET_REQUESTED, SECURITY_ALERT
```

### ProjectEvent.Type
```
CREATED, MEMBER_ADDED, MEMBER_REMOVED, STATUS_CHANGED, COMPLETED, DELETED, ROLE_CHANGED
```

### IssueEvent.EventType
```
CREATED, UPDATED, DELETED, ASSIGNED, STATUS_CHANGED, COMMENT_ADDED, COMMENT_EDITED, COMMENT_DELETED,
OVERDUE, DEADLINE_APPROACHING
```

### SprintEvent.Type
```
CREATED, STARTED, COMPLETED, ENDING_SOON
```

---

## Scheduled Jobs

| Job | Cron | Service |
|-----|------|---------|
| Checkout Reminder | 17:30 MON-FRI | `AttendanceScheduledService` |
| Missing Attendance Check | 20:00 MON-FRI | `AttendanceScheduledService` |
| Monthly Summary | 09:00 1st of month | `AttendanceScheduledService` |
| Issue Overdue Check | 08:00 daily | `IssueScheduledService` |
| Issue Deadline Reminder | 09:00 daily | `IssueScheduledService` |
| Sprint Ending Soon | 09:00 daily | `SprintScheduledService` |

---

## Important Config

```properties
# JWT
app.security.jwt.secret=${JWT_SECRET}
app.security.jwt.expiration=1800000  # 30 min
app.security.jwt.refresh-expiration=604800000  # 7 days

# AI
gemini.api.key=${GEMINI_API_KEY}
gemini.api.model=gemini-2.0-flash

# Rate Limiting
app.rate-limit.requests-per-minute=50
```

---

## Common Gotchas

1. **Don't call NotificationService directly** - Always publish Events
2. **TenantContext must be set** before any DB operation in company scope
3. **Async threads need context** - Use `ContextAwareTaskDecorator`
4. **GPS Check-in** - Only enforced for `checkInGPS()`, not `checkIn()`
5. **Feature flags** - Check `PermissionService.require*()` before feature code

---

## File Locations

- **Entities**: `src/main/java/DoAn/BE/{module}/entity/`
- **Repositories**: `src/main/java/DoAn/BE/{module}/repository/`
- **Services**: `src/main/java/DoAn/BE/{module}/service/`
- **Controllers**: `src/main/java/DoAn/BE/{module}/controller/`
- **Events**: `src/main/java/DoAn/BE/{module}/event/`
- **DTOs**: `src/main/java/DoAn/BE/{module}/dto/`
- **Config**: `src/main/java/DoAn/BE/common/config/`
- **Security**: `src/main/java/DoAn/BE/common/security/`
