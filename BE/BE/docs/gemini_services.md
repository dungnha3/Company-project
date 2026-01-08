# Gemini Backend - Service & API Documentation

## Overview
This document describes all REST API endpoints, services, and their responsibilities.

---

## API Base URL
```
http://localhost:8080/api
```

## Authentication
- **Type**: JWT Bearer Token
- **Header**: `Authorization: Bearer <token>`
- **Token Expiry**: 30 minutes (access), 7 days (refresh)

---

## Pagination
For endpoints returning lists of data, we use pagination to improve performance.
**Request Parameters:**
- `page`: Page number (0-indexed, default 0)
- `size`: Items per page (default 20)
- `sort`: Sorting criteria (format: `property,asc|desc`)

**Response Structure (`Page<T>`):**
```json
{
  "content": [ ... ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 20
  },
  "totalPages": 10,
  "totalElements": 200,
  "last": false,
  "first": true,
  "empty": false
}
```
All endpoints marked with **(Paginated)** return this structure.

---

## 1. Authentication APIs

### AuthController (`/api/auth`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/login` | User login | Public |
| POST | `/register` | User registration | Public |
| POST | `/logout` | User logout | Required |
| POST | `/refresh-token` | Refresh access token | Required |
| POST | `/forgot-password` | Request password reset | Public |
| POST | `/reset-password` | Reset password with token | Public |
| POST | `/change-password` | Change current password | Required |
| GET | `/me` | Get current user info | Required |
| POST | `/select-company` | Switch company context | Required |

**Login Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Login Response:**
```json
{
  "accessToken": "jwt-token",
  "refreshToken": "refresh-token",
  "expiresIn": 1800000,
  "user": {
    "userId": 1,
    "username": "admin",
    "email": "admin@example.com",
    "isSystemAdmin": false,
    "companyMemberships": [
      {
        "companyId": 1,
        "companyName": "Company A",
        "role": "ADMIN"
      }
    ]
  }
}
```

---

## 2. User Management APIs

### UsersController (`/api/users`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List all users (in company) | OWNER, ADMIN, MANAGER_HR |
| GET | `/{userId}` | Get user by ID | Required |
| GET | `/search` | Search users by keyword | Required |
| GET | `/active` | Get active users | Required |
| GET | `/online` | Get online users | Required |
| POST | `/` | Create new user | OWNER, ADMIN |
| PUT | `/{userId}` | Update user | OWNER, ADMIN |
| DELETE | `/{userId}` | Delete user | OWNER, ADMIN |

### AccountController (`/api/accounts`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List all accounts | SYSTEM_ADMIN |
| GET | `/{userId}` | Get account details | SYSTEM_ADMIN |
| PUT | `/{userId}/system-admin` | Toggle System Admin | SYSTEM_ADMIN |
| GET | `/role/{role}` | Get users by role | OWNER, ADMIN |
| GET | `/count/online` | Count online users | Required |

### ProfileController (`/api/profile`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| PUT | `/` | Update profile | Required |
| POST | `/change-password` | Change password | Required |
| PATCH | `/online` | Set online status | Required |
| PATCH | `/offline` | Set offline status | Required |
| PUT | `/fcm-token` | Update FCM token | Required |

> **Note**: Use `GET /api/auth/me` for fetching current user profile.

---

## 3. Company Management APIs

### CompanyController (`/api/companies`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List user's companies | Required |
| GET | `/{companyId}` | Get company details | Required |
| POST | `/` | Create new company | Required |
| PUT | `/{companyId}` | Update company | OWNER |
| DELETE | `/{companyId}` | Delete company | SYSTEM_ADMIN |
| GET | `/admin/all` | List all companies | SYSTEM_ADMIN |

### InviteController (`/api/invites`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/` | Send invitation | OWNER, ADMIN |
| GET | `/pending` | List pending invites | OWNER, ADMIN |
| POST | `/accept` | Accept invitation | Required |
| DELETE | `/{inviteId}` | Cancel invitation | OWNER, ADMIN |

---

## 4. HRM APIs

### EmployeeController (`/api/employees`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List employees (Paginated) | MANAGER_HR+ |
| GET | `/{employeeId}` | Get employee details | Required |
| POST | `/` | Create employee | MANAGER_HR+ |
| PUT | `/{employeeId}` | Update employee | MANAGER_HR+ |
| DELETE | `/{employeeId}` | Delete employee | MANAGER_HR+ |
| GET | `/search` | Search users (Paginated) | Required |
| GET | `/department/{deptId}` | Filter by department (Paginated) | MANAGER_HR+ |
| GET | `/position/{posId}` | Filter by position (Paginated) | MANAGER_HR+ |
| GET | `/status/{status}` | Filter by status (Paginated) | MANAGER_HR+ |

### DepartmentController (`/api/departments`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List departments | Required |
| POST | `/` | Create department | MANAGER_HR+ |
| PUT | `/{deptId}` | Update department | MANAGER_HR+ |
| DELETE | `/{deptId}` | Delete department | MANAGER_HR+ |

### PositionController (`/api/positions`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List positions | Required |
| POST | `/` | Create position | MANAGER_HR+ |
| PUT | `/{posId}` | Update position | MANAGER_HR+ |
| DELETE | `/{posId}` | Delete position | MANAGER_HR+ |

### AttendanceController (`/api/attendance`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/check-in` | Check in | Required |
| POST | `/check-out` | Check out | Required |
| GET | `/today` | Get today's record | Required |
| GET | `/my-history` | Get personal history | Required |
| GET | `/` | List all (Paginated) | MANAGER_HR+ |
| GET | `/employee/{empId}` | Get employee attendance (Paginated) | MANAGER_HR+ |
| GET | `/date-range` | Get by date range (Paginated) | MANAGER_HR+ |
| GET | `/report` | Generate report | MANAGER_HR+ |

### LeaveRequestController (`/api/leave-requests`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List all leave requests (Paginated) | MANAGER_HR+ |
| GET | `/employee/{employeeId}` | Get employee requests (Paginated) | Required |
| GET | `/date-range` | Get by date range (Paginated) | MANAGER_HR+ |
| GET | `/pending` | Get pending requests (Paginated) | MANAGER_HR+ |
| GET | `/approved` | Get approved requests (Paginated) | MANAGER_HR+ |
| GET | `/rejected` | Get rejected requests (Paginated) | MANAGER_HR+ |
| GET | `/{id}` | Get request details | Required |
| POST | `/` | Create leave request | Required |
| PUT | `/{id}` | Update request | Owner |
| DELETE | `/{id}` | Cancel request | Owner |
| POST | `/{id}/approve` | Approve request | MANAGER_HR+ |
| POST | `/{id}/reject` | Reject request | MANAGER_HR+ |

### SalaryController (`/api/salaries`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List salaries (Paginated) | MANAGER_ACCOUNTING+ |
| GET | `/employee/{employeeId}` | Get salaries (Paginated) | Required |
| GET | `/period` | List by period (Paginated) | MANAGER_ACCOUNTING+ |
| GET | `/status/{status}` | List by status (Paginated) | MANAGER_ACCOUNTING+ |
| GET | `/{salaryId}` | Get salary details | Required |
| POST | `/generate` | Generate monthly salaries | MANAGER_ACCOUNTING+ |
| PUT | `/{salaryId}` | Update salary | MANAGER_ACCOUNTING+ |
| POST | `/{salaryId}/pay` | Mark as paid | MANAGER_ACCOUNTING+ |

### ContractController (`/api/contracts`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List contracts | MANAGER_HR+ |
| GET | `/{contractId}` | Get contract | Required |
| POST | `/` | Create contract | MANAGER_HR+ |
| PUT | `/{contractId}` | Update contract | MANAGER_HR+ |
| DELETE | `/{contractId}` | Delete contract | MANAGER_HR+ |
| GET | `/employee/{empId}` | Get employee contracts | Required |
| GET | `/expiring` | Get expiring contracts | MANAGER_HR+ |

### ReviewController (`/api/reviews`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List reviews | MANAGER_HR+ |
| GET | `/{reviewId}` | Get review | Required |
| POST | `/` | Create review | MANAGER_HR+ |
| PUT | `/{reviewId}` | Update review | MANAGER_HR+ |
| GET | `/employee/{empId}` | Get employee reviews | Required |

### DashboardController (`/api/dashboard`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/stats` | Get HR statistics | MANAGER_HR+ |
| GET | `/monthly` | Get monthly stats | MANAGER_HR+ |

---

## 5. Project Management APIs

### ProjectController (`/api/projects`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List all projects (Paginated) | Required |
| GET | `/my-projects` | List my projects (Paginated) | Required |
| GET | `/{projectId}` | Get project details | Member |
| POST | `/` | Create project | MANAGER_PROJECT+ |
| PUT | `/{projectId}` | Update project | Project Admin |
| DELETE | `/{projectId}` | Delete project | Project Owner |
| GET | `/{projectId}/members` | List members | Member |
| POST | `/{projectId}/members` | Add member | Project Admin |
| DELETE | `/{projectId}/members/{userId}` | Remove member | Project Admin |

### SprintController (`/api/sprints`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/{sprintId}` | Get sprint | Member |
| GET | `/project/{projectId}` | List project sprints | Member |
| POST | `/` | Create sprint | Project Admin |
| PUT | `/{sprintId}` | Update sprint | Project Admin |
| DELETE | `/{sprintId}` | Delete sprint | Project Admin |
| POST | `/{sprintId}/start` | Start sprint | Project Admin |
| POST | `/{sprintId}/complete` | Complete sprint | Project Admin |

### IssueController (`/api/issues`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/{issueId}` | Get issue | Member |
| GET | `/project/{projectId}` | List project issues (Paginated) | Member |
| GET | `/project/{projectId}/backlog` | Get backlog issues (Paginated) | Member |
| GET | `/sprint/{sprintId}` | Get sprint issues (Paginated) | Member |
| GET | `/my-issues` | Get my assigned issues (Paginated) | Required |
| GET | `/my-reported` | Get my reported issues | Required |
| POST | `/` | Create issue | Member |
| PUT | `/{issueId}` | Update issue | Member |
| DELETE | `/{issueId}` | Delete issue | Reporter/Admin |
| PUT | `/{issueId}/status` | Update status | Member |
| PUT | `/{issueId}/assign` | Assign issue | Project Admin |

### IssueCommentController (`/api/comments`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/issue/{issueId}` | Get issue comments (Paginated) | Member |
| GET | `/project/{projectId}` | Get project comments (Paginated) | Member |
| POST | `/` | Create comment | Member |
| PUT | `/{commentId}` | Update comment | Owner |
| DELETE | `/{commentId}` | Delete comment | Owner/Admin |

### ProjectPhaseController (`/api/projects/{projectId}`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/phases` | Get project phases | Member |
| GET | `/gantt` | Get Gantt chart data | Member |

### IssueActivityController (`/api/activities`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/issue/{issueId}` | Issue history (Paginated) | Member |
| GET | `/project/{projectId}` | Project activity feed (Paginated) | Member |
| GET | `/project/{projectId}/my` | My activities (Paginated) | Required |
| DELETE | `/{activityId}` | Delete activity | Project Manager |

---

## 6. Chat APIs

### ChatRoomController (`/api/chat/rooms`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List my chat rooms (Paginated) | Required |
| GET | `/{roomId}` | Get room details | Member |
| POST | `/` | Create room | Required |
| POST | `/direct/{userId}` | Create direct chat | Required |
| PUT | `/{roomId}` | Update room | Room Admin |
| DELETE | `/{roomId}` | Delete room | Room Admin |
| GET | `/{roomId}/members` | List members | Member |
| POST | `/{roomId}/members` | Add member | Room Admin |

### MessageController (`/api/chat/messages`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/room/{roomId}` | Get room messages | Member |
| POST | `/` | Send message | Member |
| PUT | `/{messageId}` | Edit message | Owner |
| DELETE | `/{messageId}` | Delete message | Owner/Admin |
| POST | `/{messageId}/react` | Add reaction | Member |

---

## 7. Storage APIs

### StorageController (`/api/storage`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/files/{fileId}` | Get file metadata | Required |
| GET | `/files/{fileId}/download` | Download file | Required |
| GET | `/files/my-files` | List my files | Required |
| POST | `/files/upload` | Upload file | Required |
| DELETE | `/files/{fileId}` | Delete file | Owner |
| GET | `/folders/{folderId}` | Get folder | Required |
| GET | `/folders/my-folders` | List my folders | Required |
| POST | `/folders` | Create folder | Required |
| DELETE | `/folders/{folderId}` | Delete folder | Owner |
| GET | `/stats` | Get storage stats | Required |

### PublicStorageController (`/api/public/files`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/{fileId}/download` | Download public file | Public |

> **Note**: Only files with `isPublic=true` can be accessed via this endpoint.

---

## 8. Notification APIs

### NotificationController (`/api/notifications`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | List my notifications | Required |
| GET | `/unread` | List unread notifications | Required |
| GET | `/count` | Get unread count | Required |
| PUT | `/{notificationId}/read` | Mark as read | Required |
| PUT | `/read-all` | Mark all as read | Required |
| DELETE | `/{notificationId}` | Delete notification | Required |

---

## 9. Audit APIs

### AuditLogController (`/api/audit-logs`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | Recent logs (Paginated) | ADMIN |
| GET | `/actor/{actorId}` | Logs by actor (Paginated) | ADMIN |
| GET | `/target/{targetUserId}` | Logs by target (Paginated) | ADMIN |
| GET | `/critical` | Critical logs (Paginated) | ADMIN |
| GET | `/admin-on-managers` | Admin actions (Paginated) | ADMIN |

---

## Services Architecture

### Core Services

| Service | Responsibility |
|---------|----------------|
| `AuthService` | Authentication, token management |
| `JwtService` | JWT token generation/validation |
| `SessionService` | User session management |
| `UserService` | User CRUD operations |
| `UserSaasService` | Multi-tenant user operations |
| `AccessControlService` | Permission checking |
| `PermissionService` | Feature flag validation |

### HRM Services

| Service | Responsibility |
|---------|----------------|
| `EmployeeService` | Employee management |
| `AttendanceService` | Time tracking |
| `LeaveRequestService` | Leave management |
| `SalaryService` | Payroll processing |
| `ContractService` | Contract management |
| `DepartmentService` | Department operations |
| `PositionService` | Position operations |

### Project Services

| Service | Responsibility |
|---------|----------------|
| `ProjectService` | Project CRUD |
| `SprintService` | Sprint management |
| `IssueService` | Issue tracking |
| `ProjectDashboardService` | Project statistics |

### Notification Services

| Service | Responsibility |
|---------|----------------|
| `NotificationService` | Notification CRUD |
| `EmailNotificationService` | Email sending |
| `FCMService` | Push notifications |

---

## Security Headers

All requests require:
- `X-Company-Id`: Company context header (for multi-tenant APIs)

Rate Limiting:
- 50 requests per minute per IP
- Returns `429 Too Many Requests` when exceeded

---

## Error Responses

```json
{
  "timestamp": "2026-01-08T12:00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "path": "/api/users"
}
```

| Status | Description |
|--------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Not logged in |
| 403 | Forbidden - No permission |
| 404 | Not Found - Resource not found |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |
